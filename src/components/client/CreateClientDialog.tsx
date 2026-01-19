import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminAPI } from '@/integrations/laravel/api';
import { toast } from 'sonner';
import JDELogo from '@/assets/JDE.png';
import JDMOLogo from '@/assets/JDMO.png';
import DBCSLogo from '@/assets/DBCS.png';

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface World {
  id: string;
  code: string;
  name: string;
}

const CreateClientDialog = ({ open, onOpenChange, onSuccess }: CreateClientDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [accessibleWorlds, setAccessibleWorlds] = useState<World[]>([
    { id: '1', code: 'JDE', name: 'Justice Childhood' }, // Use integer IDs matching database
    { id: '2', code: 'JDMO', name: 'Development' },
    { id: '3', code: 'DBCS', name: 'Archives' }
  ]);
  const [selectedWorldId, setSelectedWorldId] = useState('');
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
    // New fields for JDE workflow Step 2
    date_reception: '',
    origine: '',
    montant_dommage_batiment: '',
    montant_demolition_deblayage: '',
    montant_mise_conformite: '',
    adresse_identique_sinistre: false,
    // Coordonnées du propriétaire (pour locataires uniquement)
    proprietaire_nom: '',
    proprietaire_prenom: '',
    proprietaire_telephone: '',
    proprietaire_email: '',
    proprietaire_adresse: '',
  });

  // No API calls needed - using hardcoded worlds for client creation
  // TODO: Implement /api/worlds endpoint for dynamic world loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientInfo.nom.trim() || !clientInfo.prenom.trim()) {
      toast.error('Le nom et prénom sont requis');
      return;
    }

    if (!selectedWorldId) {
      toast.error('Veuillez sélectionner un monde');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement Laravel API for creating clients
      // await adminAPI.createClient({ selectedWorldId, ...clientInfo });

      await adminAPI.createClient({
        world_id: selectedWorldId,
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
        // New fields for JDE workflow Step 2
        date_reception: clientInfo.date_reception || null,
        origine: clientInfo.origine,
        montant_dommage_batiment: clientInfo.montant_dommage_batiment || null,
        nom_proprietaire: clientInfo.client_type === 'locataire' ? clientInfo.proprietaire_nom : null,
        prenom_proprietaire: clientInfo.client_type === 'locataire' ? clientInfo.proprietaire_prenom : null,
        telephone_proprietaire: clientInfo.client_type === 'locataire' ? clientInfo.proprietaire_telephone : null,
        email_proprietaire: clientInfo.client_type === 'locataire' ? clientInfo.proprietaire_email : null,
        adresse_proprietaire: clientInfo.client_type === 'locataire' ? clientInfo.proprietaire_adresse : null,
      });

      toast.success('Fiche client créée avec succès');

      // Reset form
      setSelectedWorldId('');
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
        montant_dommage_batiment: '',
        montant_demolition_deblayage: '',
        montant_mise_conformite: '',
        adresse_identique_sinistre: false,
        proprietaire_nom: '',
        proprietaire_prenom: '',
        proprietaire_telephone: '',
        proprietaire_email: '',
        proprietaire_adresse: '',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast.error(error.message || 'Erreur lors de la création de la fiche client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Créer une fiche client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div>
            <Label>Monde *</Label>
            <div className="flex gap-4 justify-center mt-3">
              {accessibleWorlds.map((world) => {
                const isSelected = selectedWorldId === world.id;
                const logoMap: Record<string, string> = {
                  JDE: JDELogo,
                  JDMO: JDMOLogo,
                  DBCS: DBCSLogo,
                };
                const logo = logoMap[world.code];
                
                return (
                  <button
                    key={world.id}
                    type="button"
                    onClick={() => setSelectedWorldId(world.id)}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      isSelected 
                        ? 'border-primary shadow-lg scale-105' 
                        : 'border-gray-300 grayscale opacity-50 hover:opacity-75'
                    }`}
                  >
                    <img src={logo} alt={world.name} className="h-16 w-auto" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="client_type">Type de client *</Label>
            <Select
              value={clientInfo.client_type}
              onValueChange={(value) => setClientInfo({ ...clientInfo, client_type: value })}
            >
              <SelectTrigger>
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={clientInfo.nom}
                onChange={(e) => setClientInfo({ ...clientInfo, nom: e.target.value })}
                placeholder="Nom"
              />
            </div>
            <div>
              <Label htmlFor="prenom">Prénom *</Label>
              <Input
                id="prenom"
                value={clientInfo.prenom}
                onChange={(e) => setClientInfo({ ...clientInfo, prenom: e.target.value })}
                placeholder="Prénom"
              />
            </div>
            <div>
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                value={clientInfo.telephone}
                onChange={(e) => setClientInfo({ ...clientInfo, telephone: e.target.value })}
                placeholder="Téléphone"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={clientInfo.email}
                onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                placeholder="Email"
              />
            </div>
            <div>
              <Label htmlFor="adresse_client">Adresse client</Label>
              <Input
                id="adresse_client"
                value={clientInfo.adresse_client}
                onChange={(e) => setClientInfo({ ...clientInfo, adresse_client: e.target.value })}
                placeholder="Adresse du client"
              />
            </div>
          </div>

          {clientInfo.client_type === 'locataire' && (
            <div className="border-t pt-4 bg-amber-50/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                🏠 Coordonnées du propriétaire
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="proprietaire_nom">Nom</Label>
                  <Input
                    id="proprietaire_nom"
                    value={clientInfo.proprietaire_nom}
                    onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_nom: e.target.value })}
                    placeholder="Nom du propriétaire"
                  />
                </div>
                <div>
                  <Label htmlFor="proprietaire_prenom">Prénom</Label>
                  <Input
                    id="proprietaire_prenom"
                    value={clientInfo.proprietaire_prenom}
                    onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_prenom: e.target.value })}
                    placeholder="Prénom du propriétaire"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="proprietaire_telephone">Téléphone</Label>
                  <Input
                    id="proprietaire_telephone"
                    value={clientInfo.proprietaire_telephone}
                    onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_telephone: e.target.value })}
                    placeholder="Téléphone du propriétaire"
                  />
                </div>
                <div>
                  <Label htmlFor="proprietaire_email">Email</Label>
                  <Input
                    id="proprietaire_email"
                    type="email"
                    value={clientInfo.proprietaire_email}
                    onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_email: e.target.value })}
                    placeholder="Email du propriétaire"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="proprietaire_adresse">Adresse</Label>
                <Input
                  id="proprietaire_adresse"
                  value={clientInfo.proprietaire_adresse}
                  onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_adresse: e.target.value })}
                  placeholder="Adresse du propriétaire"
                />
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Informations sinistre</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="adresse_sinistre">Adresse du sinistre</Label>
                <Input
                  id="adresse_sinistre"
                  value={clientInfo.adresse_sinistre}
                  onChange={(e) => setClientInfo({ ...clientInfo, adresse_sinistre: e.target.value })}
                  placeholder="Adresse du sinistre"
                />
              </div>
              <div>
                <Label htmlFor="type_sinistre">Type de sinistre</Label>
                <Input
                  id="type_sinistre"
                  value={clientInfo.type_sinistre}
                  onChange={(e) => setClientInfo({ ...clientInfo, type_sinistre: e.target.value })}
                  placeholder="Type de sinistre"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <Label htmlFor="date_sinistre">Date du sinistre</Label>
                <Input
                  id="date_sinistre"
                  type="date"
                  value={clientInfo.date_sinistre}
                  onChange={(e) => setClientInfo({ ...clientInfo, date_sinistre: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="compagnie_assurance">Compagnie d'assurance</Label>
                <Input
                  id="compagnie_assurance"
                  value={clientInfo.compagnie_assurance}
                  onChange={(e) => setClientInfo({ ...clientInfo, compagnie_assurance: e.target.value })}
                  placeholder="Compagnie"
                />
              </div>
              <div>
                <Label htmlFor="numero_police">Numéro de police</Label>
                <Input
                  id="numero_police"
                  value={clientInfo.numero_police}
                  onChange={(e) => setClientInfo({ ...clientInfo, numero_police: e.target.value })}
                  placeholder="N° de police"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="date_reception">Date de réception</Label>
                <Input
                  id="date_reception"
                  type="date"
                  value={clientInfo.date_reception}
                  onChange={(e) => setClientInfo({ ...clientInfo, date_reception: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="origine">Origine</Label>
                <Select
                  value={clientInfo.origine}
                  onValueChange={(value) => setClientInfo({ ...clientInfo, origine: value })}
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
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Montants (optionnel)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="montant_dommage_batiment">Dommage bâtiment (€)</Label>
                <Input
                  id="montant_dommage_batiment"
                  type="number"
                  step="0.01"
                  value={clientInfo.montant_dommage_batiment}
                  onChange={(e) => setClientInfo({ ...clientInfo, montant_dommage_batiment: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="montant_demolition_deblayage">Démolition/Déblayage (€)</Label>
                <Input
                  id="montant_demolition_deblayage"
                  type="number"
                  step="0.01"
                  value={clientInfo.montant_demolition_deblayage}
                  onChange={(e) => setClientInfo({ ...clientInfo, montant_demolition_deblayage: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="montant_mise_conformite">Mise en conformité (€)</Label>
                <Input
                  id="montant_mise_conformite"
                  type="number"
                  step="0.01"
                  value={clientInfo.montant_mise_conformite}
                  onChange={(e) => setClientInfo({ ...clientInfo, montant_mise_conformite: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading ? 'Création...' : 'Créer la fiche client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateClientDialog;
