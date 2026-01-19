import { useState, useEffect } from 'react';
import { dossierAPI, adminAPI } from '@/integrations/laravel/api';
import { useAuthStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateDossierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worldId: string;
  onSuccess: () => void;
}

const CreateDossierDialog = ({ open, onOpenChange, worldId, onSuccess }: CreateDossierDialogProps) => {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [clientMode, setClientMode] = useState<'none' | 'new' | 'existing'>('none');
  const [existingClients, setExistingClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    tags: '',
  });
  const [clientInfo, setClientInfo] = useState({
    client_type: 'locataire',
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse_client: '',
    adresse_sinistre: '',
    type_sinistre: '',
    date_sinistre: '',
    compagnie_assurance: '',
    numero_police: '',
    date_reception: '',
    origine: '',
    proprietaire_nom: '',
    proprietaire_prenom: '',
    proprietaire_telephone: '',
    proprietaire_email: '',
    proprietaire_adresse: '',
  });

  // Fetch existing clients when dialog opens
  useEffect(() => {
    if (open && worldId) {
      fetchExistingClients();
    }
  }, [open, worldId]);

  // Filter clients based on search query
  useEffect(() => {
    if (clientSearchQuery.trim()) {
      const filtered = existingClients.filter((client) =>
        client.nom?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        client.prenom?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        client.telephone?.includes(clientSearchQuery)
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(existingClients);
    }
  }, [clientSearchQuery, existingClients]);

  const fetchExistingClients = async () => {
    try {
      console.log('Fetching all clients from database');

      // Fetch ALL clients in the database (not just world-specific ones)
      // Using adminAPI.getClients() which calls /api/clients
      const clientsResponse = await adminAPI.getClients();

      console.log('Clients API response:', clientsResponse);

      if (clientsResponse.clients) {
        // Filter to only show clients that are NOT already associated with a dossier
        // (clients with null dossier_id can be associated with new dossiers)
        const availableClients = clientsResponse.clients.filter((client: any) => !client.dossier_id);
        console.log('Filtered available clients (no dossier_id):', availableClients);
        setExistingClients(availableClients);
      } else {
        console.error('No clients data in response');
        setExistingClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setExistingClients([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted, title:', formData.title, 'title trim:', formData.title.trim(), 'profile:', profile ? 'exists' : 'null');
    if (!formData.title.trim() || !profile) {
      console.log('Validation failed - title or profile missing');
      return;
    }

    setLoading(true);
    try {
      // Simplified dossier creation using Laravel API
      const dossierData = {
        world_id: worldId,
        title: formData.title.trim(),
        tags: formData.tags
          ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          : [],
      };

      const response = await dossierAPI.createDossier(dossierData);
      console.log('Dossier created response:', response);

      if (response.message && response.dossier?.id) {
        const dossierId = response.dossier.id;

        // Handle client association
        if (clientMode === 'existing' && selectedClientId) {
          // Associate existing client with dossier
          console.log('Associating existing client:', selectedClientId, 'with dossier:', dossierId);
          try {
            await adminAPI.updateClient(selectedClientId, { dossier_id: dossierId });
            console.log('Client associated successfully');
          } catch (clientError: any) {
            console.error('Failed to associate client:', clientError);
            toast.error('Dossier créé mais échec d\'association du client');
          }
        } else if (clientMode === 'new') {
          // Create client info directly in dossier_client_info table
          console.log('Creating client info for dossier:', dossierId);
          try {
            const clientData = {
              client_type: clientInfo.client_type,
              nom: clientInfo.nom,
              prenom: clientInfo.prenom,
              telephone: clientInfo.telephone,
              email: clientInfo.email,
              adresse_client: clientInfo.adresse_client,
              adresse_sinistre: clientInfo.adresse_sinistre,
              type_sinistre: clientInfo.type_sinistre,
              date_sinistre: clientInfo.date_sinistre || null,
              compagnie_assurance: clientInfo.compagnie_assurance,
              numero_police: clientInfo.numero_police,
              date_reception: clientInfo.date_reception || null,
              origine: clientInfo.origine,
              // Backend field names for proprietor
              nom_proprietaire: clientInfo.proprietaire_nom || null,
              prenom_proprietaire: clientInfo.proprietaire_prenom || null,
              telephone_proprietaire: clientInfo.proprietaire_telephone || null,
              email_proprietaire: clientInfo.proprietaire_email || null,
              adresse_proprietaire: clientInfo.proprietaire_adresse || null,
            };

            // Use dossierAPI.updateClientInfo to save to dossier_client_info table
            await dossierAPI.updateClientInfo(dossierId, clientData);
            console.log('Client info created successfully');
          } catch (clientError: any) {
            console.error('Failed to create client info:', clientError);
            toast.error('Dossier créé mais échec de création de la fiche client');
          }
        }

        toast.success('Dossier créé avec succès');

        // Reset form
        setFormData({ title: '', tags: '' });
        setClientMode('none');
        setSelectedClientId('');
        setClientSearchQuery('');
        setClientInfo({
          client_type: 'locataire',
          nom: '',
          prenom: '',
          telephone: '',
          email: '',
          adresse_client: '',
          adresse_sinistre: '',
          type_sinistre: '',
          date_sinistre: '',
          compagnie_assurance: '',
          numero_police: '',
          proprietaire_nom: '',
          proprietaire_prenom: '',
          proprietaire_telephone: '',
          proprietaire_email: '',
          proprietaire_adresse: '',
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error('Échec de création du dossier');
      }
    } catch (error: any) {
      console.error('Error creating dossier:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || error.message || 'Erreur lors de la création du dossier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl">Créer un nouveau dossier</DialogTitle>
          <DialogDescription className="text-base">
            Remplissez les informations pour créer un nouveau dossier
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 p-6 max-h-[75vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="title">
                Titre du dossier <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ex: Sinistre Incendie - Dupont"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">
                Tags <span className="text-muted-foreground text-xs">(optionnel, séparés par des virgules)</span>
              </Label>
              <Input
                id="tags"
                placeholder="Ex: urgent, incendie, particulier"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                disabled={loading}
              />
            </div>

            {/* Client Mode Selection */}
            <div className="space-y-4 p-5 border rounded-lg bg-muted/30">
              <Label className="text-base font-semibold">Fiche Client</Label>
              <p className="text-sm text-muted-foreground">
                Choisissez comment associer un client à ce dossier
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant={clientMode === 'new' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setClientMode('new')}
                  disabled={loading}
                >
                  Créer une nouvelle fiche client
                </Button>
                <Button
                  type="button"
                  variant={clientMode === 'existing' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setClientMode('existing')}
                  disabled={loading}
                >
                  Associer une fiche existante
                </Button>
              </div>
            </div>

            {/* Select Existing Client */}
            {clientMode === 'existing' && (
              <div className="space-y-3 p-4 border rounded-lg bg-accent/5">
                <Label>Sélectionner un client</Label>
                {existingClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Aucune fiche client associée à ce monde.
                  </p>
                ) : (
                  <Select
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={clientSearchQuery || "Tapez pour rechercher ou sélectionnez..."}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClients.length === 0 && clientSearchQuery.trim() ? (
                        <div className="px-2 py-1 text-sm text-muted-foreground">
                          Aucun client trouvé.
                        </div>
                      ) : (
                        <>
                          <div className="px-2 py-1">
                            <Input
                              placeholder="Tapez pour filtrer..."
                              value={clientSearchQuery}
                              onChange={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setClientSearchQuery(e.target.value);
                              }}
                              className="h-8 text-sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            />
                          </div>
                          <div className="border-t my-1"></div>
                          {filteredClients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.prenom} {client.nom} {client.email && `(${client.email})`}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Client Info Form */}
            {clientMode === 'new' && (
              <div className="space-y-5 p-5 border rounded-lg bg-accent/5">
                <h4 className="font-semibold text-base">Informations Client</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_type">Type de client</Label>
                    <Select
                      value={clientInfo.client_type}
                      onValueChange={(value) => setClientInfo({ ...clientInfo, client_type: value })}
                      disabled={loading}
                    >
                      <SelectTrigger id="client_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="locataire">Locataire</SelectItem>
                        <SelectItem value="proprietaire">Propriétaire</SelectItem>
                        <SelectItem value="proprietaire_non_occupant">Propriétaire non occupant</SelectItem>
                        <SelectItem value="professionnel">Professionnel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      value={clientInfo.nom}
                      onChange={(e) => setClientInfo({ ...clientInfo, nom: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input
                      id="prenom"
                      value={clientInfo.prenom}
                      onChange={(e) => setClientInfo({ ...clientInfo, prenom: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      type="tel"
                      value={clientInfo.telephone}
                      onChange={(e) => setClientInfo({ ...clientInfo, telephone: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={clientInfo.email}
                      onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adresse_client">Adresse du client</Label>
                    <Input
                      id="adresse_client"
                      value={clientInfo.adresse_client}
                      onChange={(e) => setClientInfo({ ...clientInfo, adresse_client: e.target.value })}
                      placeholder="Adresse personnelle du client"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adresse_sinistre">Adresse du sinistre</Label>
                    <Input
                      id="adresse_sinistre"
                      value={clientInfo.adresse_sinistre}
                      onChange={(e) => setClientInfo({ ...clientInfo, adresse_sinistre: e.target.value })}
                      placeholder="Adresse où le sinistre s'est produit"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type_sinistre">Type de sinistre</Label>
                    <Input
                      id="type_sinistre"
                      value={clientInfo.type_sinistre}
                      onChange={(e) => setClientInfo({ ...clientInfo, type_sinistre: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_sinistre">Date du sinistre</Label>
                    <Input
                      id="date_sinistre"
                      type="date"
                      value={clientInfo.date_sinistre}
                      onChange={(e) => setClientInfo({ ...clientInfo, date_sinistre: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compagnie_assurance">Compagnie d'assurance</Label>
                    <Input
                      id="compagnie_assurance"
                      value={clientInfo.compagnie_assurance}
                      onChange={(e) => setClientInfo({ ...clientInfo, compagnie_assurance: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_reception">Date de réception</Label>
                    <Input
                      id="date_reception"
                      type="date"
                      value={clientInfo.date_reception}
                      onChange={(e) => setClientInfo({ ...clientInfo, date_reception: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="origine">Origine</Label>
                    <Select
                      value={clientInfo.origine}
                      onValueChange={(value) => setClientInfo({ ...clientInfo, origine: value })}
                      disabled={loading}
                    >
                      <SelectTrigger id="origine">
                        <SelectValue placeholder="Sélectionner l'origine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Téléphone">Téléphone</SelectItem>
                        <SelectItem value="Courrier">Courrier</SelectItem>
                        <SelectItem value="Plateforme">Plateforme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero_police">N° de police</Label>
                    <Input
                      id="numero_police"
                      value={clientInfo.numero_police}
                      onChange={(e) => setClientInfo({ ...clientInfo, numero_police: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Landlord Info - Only for Tenants */}
                {clientInfo.client_type === 'locataire' && (
                  <div className="border-t pt-4 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-lg mt-4">
                    <h4 className="font-semibold text-base mb-4">Coordonnées du propriétaire</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="proprietaire_nom">Nom</Label>
                        <Input
                          id="proprietaire_nom"
                          value={clientInfo.proprietaire_nom}
                          onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_nom: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proprietaire_prenom">Prénom</Label>
                        <Input
                          id="proprietaire_prenom"
                          value={clientInfo.proprietaire_prenom}
                          onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_prenom: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="proprietaire_telephone">Téléphone</Label>
                        <Input
                          id="proprietaire_telephone"
                          type="tel"
                          value={clientInfo.proprietaire_telephone}
                          onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_telephone: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proprietaire_email">Email</Label>
                        <Input
                          id="proprietaire_email"
                          type="email"
                          value={clientInfo.proprietaire_email}
                          onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_email: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="proprietaire_adresse">Adresse</Label>
                        <Input
                          id="proprietaire_adresse"
                          value={clientInfo.proprietaire_adresse}
                          onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_adresse: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer le dossier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDossierDialog;
