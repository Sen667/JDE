import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { adminAPI } from '@/integrations/laravel/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ClientInfo {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  client_type: 'locataire' | 'proprietaire' | 'proprietaire_non_occupant' | 'professionnel';
  adresse_client: string | null;
  adresse_sinistre: string | null;
  adresse_identique_sinistre: boolean | null;
  type_sinistre: string | null;
  date_sinistre: string | null;
  compagnie_assurance: string | null;
  numero_police: string | null;
  montant_dommage_batiment: number | null;
  montant_demolition_deblayage: number | null;
  montant_mise_conformite: number | null;
  primary_world_id: string | null;
  // New fields for JDE workflow Step 2
  date_reception: string | null;
  origine: string | null;
  // Coordonnées du propriétaire (pour locataires uniquement)
  proprietaire_nom: string | null;
  proprietaire_prenom: string | null;
  proprietaire_telephone: string | null;
  proprietaire_email: string | null;
  proprietaire_adresse: string | null;
}


interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  onSuccess?: () => void;
}

const EditClientDialog = ({ open, onOpenChange, clientId, onSuccess }: EditClientDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [formData, setFormData] = useState<Partial<ClientInfo>>({
    client_type: 'locataire',
    adresse_identique_sinistre: false,
    date_reception: null,
    origine: null,
  });

  useEffect(() => {
    if (open && clientId) {
      fetchClientData();
    }
  }, [open, clientId]);

  const fetchClientData = async () => {
    if (!clientId) return;

    try {
      setFetching(true);
      const response = await adminAPI.getClient(clientId);
      setFormData(response.client);
    } catch (error) {
      console.error('Error fetching client:', error);
      toast.error('Erreur lors du chargement des données client');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;

    try {
      setLoading(true);
      await adminAPI.updateClient(clientId, formData);
      toast.success('Fiche client mise à jour avec succès');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erreur lors de la mise à jour de la fiche client');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ClientInfo, value: string | number | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (fetching) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la fiche client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type de client */}
          <div className="space-y-2">
            <Label htmlFor="client_type">Type de client *</Label>
            <Select
              value={formData.client_type}
              onValueChange={(value) => handleInputChange('client_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="locataire">Locataire</SelectItem>
                <SelectItem value="proprietaire">Propriétaire</SelectItem>
                <SelectItem value="proprietaire_non_occupant">Propriétaire non occupant</SelectItem>
                <SelectItem value="professionnel">Professionnel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Informations personnelles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={formData.nom || ''}
                onChange={(e) => handleInputChange('nom', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input
                id="prenom"
                value={formData.prenom || ''}
                onChange={(e) => handleInputChange('prenom', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                value={formData.telephone || ''}
                onChange={(e) => handleInputChange('telephone', e.target.value)}
              />
            </div>
          </div>

          {/* Adresse client */}
          <div className="space-y-2">
            <Label htmlFor="adresse_client">Adresse du client</Label>
            <Input
              id="adresse_client"
              value={formData.adresse_client || ''}
              onChange={(e) => handleInputChange('adresse_client', e.target.value)}
            />
          </div>

          {/* Coordonnées du propriétaire (pour locataires uniquement) */}
          {formData.client_type === 'locataire' && (
            <div className="space-y-4 pt-4 border-t bg-amber-50/50 p-4 rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                🏠 Coordonnées du propriétaire
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proprietaire_nom">Nom</Label>
                  <Input
                    id="proprietaire_nom"
                    value={formData.proprietaire_nom || ''}
                    onChange={(e) => handleInputChange('proprietaire_nom', e.target.value)}
                    placeholder="Nom du propriétaire"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proprietaire_prenom">Prénom</Label>
                  <Input
                    id="proprietaire_prenom"
                    value={formData.proprietaire_prenom || ''}
                    onChange={(e) => handleInputChange('proprietaire_prenom', e.target.value)}
                    placeholder="Prénom du propriétaire"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proprietaire_telephone">Téléphone</Label>
                  <Input
                    id="proprietaire_telephone"
                    value={formData.proprietaire_telephone || ''}
                    onChange={(e) => handleInputChange('proprietaire_telephone', e.target.value)}
                    placeholder="Téléphone du propriétaire"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proprietaire_email">Email</Label>
                  <Input
                    id="proprietaire_email"
                    type="email"
                    value={formData.proprietaire_email || ''}
                    onChange={(e) => handleInputChange('proprietaire_email', e.target.value)}
                    placeholder="Email du propriétaire"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proprietaire_adresse">Adresse</Label>
                <Input
                  id="proprietaire_adresse"
                  value={formData.proprietaire_adresse || ''}
                  onChange={(e) => handleInputChange('proprietaire_adresse', e.target.value)}
                  placeholder="Adresse du propriétaire"
                />
              </div>
            </div>
          )}

          {/* Informations JDE workflow Step 2 */}
          <div className="space-y-4 pt-4 border-t bg-blue-50/50 p-4 rounded-lg">
            <h3 className="font-semibold flex items-center gap-2">
              📋 Origine du dossier
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_reception">Date de réception</Label>
                <Input
                  id="date_reception"
                  type="date"
                  value={formData.date_reception || ''}
                  onChange={(e) => handleInputChange('date_reception', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origine">Origine</Label>
                <Select
                  value={formData.origine || ''}
                  onValueChange={(value) => handleInputChange('origine', value)}
                >
                  <SelectTrigger>
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

          {/* Informations sinistre */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Informations du sinistre</h3>

            <div className="space-y-2">
              <Label htmlFor="adresse_sinistre">Adresse du sinistre</Label>
              <Input
                id="adresse_sinistre"
                value={formData.adresse_sinistre || ''}
                onChange={(e) => handleInputChange('adresse_sinistre', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type_sinistre">Type de sinistre</Label>
                <Input
                  id="type_sinistre"
                  value={formData.type_sinistre || ''}
                  onChange={(e) => handleInputChange('type_sinistre', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_sinistre">Date du sinistre</Label>
                <Input
                  id="date_sinistre"
                  type="date"
                  value={formData.date_sinistre || ''}
                  onChange={(e) => handleInputChange('date_sinistre', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="compagnie_assurance">Compagnie d'assurance</Label>
                <Input
                  id="compagnie_assurance"
                  value={formData.compagnie_assurance || ''}
                  onChange={(e) => handleInputChange('compagnie_assurance', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero_police">Numéro de police</Label>
                <Input
                  id="numero_police"
                  value={formData.numero_police || ''}
                  onChange={(e) => handleInputChange('numero_police', e.target.value)}
                />
              </div>
            </div>

            {/* Montants */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold text-sm">Montants estimés</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="montant_dommage_batiment">Dommage bâtiment (€)</Label>
                  <Input
                    id="montant_dommage_batiment"
                    type="number"
                    step="0.01"
                    value={formData.montant_dommage_batiment || ''}
                    onChange={(e) =>
                      handleInputChange('montant_dommage_batiment', parseFloat(e.target.value) || null)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="montant_demolition_deblayage">Démolition/Déblayage (€)</Label>
                  <Input
                    id="montant_demolition_deblayage"
                    type="number"
                    step="0.01"
                    value={formData.montant_demolition_deblayage || ''}
                    onChange={(e) =>
                      handleInputChange('montant_demolition_deblayage', parseFloat(e.target.value) || null)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="montant_mise_conformite">Mise en conformité (€)</Label>
                  <Input
                    id="montant_mise_conformite"
                    type="number"
                    step="0.01"
                    value={formData.montant_mise_conformite || ''}
                    onChange={(e) =>
                      handleInputChange('montant_mise_conformite', parseFloat(e.target.value) || null)
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientDialog;
