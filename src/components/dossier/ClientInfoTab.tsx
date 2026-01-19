import { useEffect, useState } from 'react';
import { dossierAPI } from '@/integrations/laravel/api';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Edit2, Save, X } from 'lucide-react';

interface ClientInfoTabProps {
  dossierId: string;
}

interface ClientInfo {
  id?: string;
  client_type: 'locataire' | 'proprietaire' | 'proprietaire_non_occupant' | 'professionnel';
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  // JDE workflow Step 2 fields
  date_reception?: string;
  origine?: string;
  // New shared fields
  nom_societe?: string;
  adresse_facturation?: string;
  travaux_suite_sinistre?: 'oui' | 'non';
  type_proprietaire?: 'proprietaire' | 'proprietaire_non_occupant' | 'exploitant';
  origine_dossier?: 'jde' | 'nle' | 'autres';
  numero_dossier_jde?: string;
  references_devis_travaux?: string;
  nature_travaux?: 'renovation' | 'reconstruction';
  numero_permis_construire?: string;
  numero_declaration_prealable?: string;
  // DBCS specific fields
  adresse_realisation_travaux?: string;
  branchement_provisoire?: 'oui' | 'non';
  occupation_voirie?: 'oui' | 'non';
  // JDMO specific fields
  adresse_realisation_missions?: string;
  modification_plan?: 'oui' | 'non';
  // Existing fields
  adresse_client: string;
  adresse_sinistre: string;
  type_sinistre: string;
  date_sinistre: string;
  compagnie_assurance: string;
  numero_police: string;
  proprietaire_nom?: string;
  proprietaire_prenom?: string;
  proprietaire_telephone?: string;
  proprietaire_email?: string;
  proprietaire_adresse?: string;
}

interface Dossier {
  id: string;
  world?: {
    code: string;
    name: string;
  };
  client_info?: ClientInfo;
}

const ClientInfoTab = ({ dossierId }: ClientInfoTabProps) => {
  const { user } = useAuthStore();
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClientInfo();
  }, [dossierId]);

  const fetchClientInfo = async () => {
    try {
      // Get dossier details to check client info - Laravel API
      const dossierResult = await dossierAPI.getDossier(dossierId);
      setDossier(dossierResult.dossier);

      if (dossierResult.dossier && dossierResult.dossier.client_info) {
        setClientInfo(dossierResult.dossier.client_info);
      } else {
        // Initialize empty form
        setClientInfo({
          client_type: 'locataire',
          nom: '',
          prenom: '',
          telephone: '',
          email: '',
          date_reception: '',
          origine: '',
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
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error fetching client info:', error);
      // Set empty form as fallback
      setClientInfo({
        client_type: 'locataire',
        nom: '',
        prenom: '',
        telephone: '',
        email: '',
        date_reception: '',
        origine: '',
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
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clientInfo) return;

    setSaving(true);
    try {
      const payload = {
        client_type: clientInfo.client_type,
        nom: clientInfo.nom,
        prenom: clientInfo.prenom,
        telephone: clientInfo.telephone,
        email: clientInfo.email,
        // New shared fields
        nom_societe: clientInfo.nom_societe || null,
        adresse_facturation: clientInfo.adresse_facturation || null,
        travaux_suite_sinistre: clientInfo.travaux_suite_sinistre || null,
        type_proprietaire: clientInfo.type_proprietaire || null,
        origine_dossier: clientInfo.origine_dossier || null,
        numero_dossier_jde: clientInfo.numero_dossier_jde || null,
        references_devis_travaux: clientInfo.references_devis_travaux || null,
        nature_travaux: clientInfo.nature_travaux || null,
        numero_permis_construire: clientInfo.numero_permis_construire || null,
        numero_declaration_prealable: clientInfo.numero_declaration_prealable || null,
        // DBCS specific fields
        adresse_realisation_travaux: clientInfo.adresse_realisation_travaux || null,
        branchement_provisoire: clientInfo.branchement_provisoire || null,
        occupation_voirie: clientInfo.occupation_voirie || null,
        // JDMO specific fields
        adresse_realisation_missions: clientInfo.adresse_realisation_missions || null,
        modification_plan: clientInfo.modification_plan || null,
        // Existing fields
        adresse_client: clientInfo.adresse_client,
        adresse_sinistre: clientInfo.adresse_sinistre,
        type_sinistre: clientInfo.type_sinistre,
        date_sinistre: clientInfo.date_sinistre || null,
        compagnie_assurance: clientInfo.compagnie_assurance,
        numero_police: clientInfo.numero_police,
        // Backend field names (nom_proprietaire, etc.)
        nom_proprietaire: clientInfo.proprietaire_nom || null,
        prenom_proprietaire: clientInfo.proprietaire_prenom || null,
        telephone_proprietaire: clientInfo.proprietaire_telephone || null,
        email_proprietaire: clientInfo.proprietaire_email || null,
        adresse_proprietaire: clientInfo.proprietaire_adresse || null,
      };

      // Use the existing Laravel API to update client info
      await dossierAPI.updateClientInfo(dossierId, payload);

      toast.success('Informations client enregistrées avec succès');
      setIsEditing(false);
      // Refresh data to show updated info
      fetchClientInfo();

    } catch (error) {
      console.error('Error saving client info:', error);
      const axiosError = error as { response?: { data?: { message?: string; error?: string } } };
      const errorMessage = axiosError.response?.data?.message || axiosError.response?.data?.error || 'Erreur lors de l\'enregistrement';
      toast.error(`Erreur: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchClientInfo();
  };

  const getClientTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      locataire: 'Locataire',
      proprietaire: 'Propriétaire',
      proprietaire_non_occupant: 'Propriétaire non occupant',
      professionnel: 'Professionnel',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clientInfo) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Aucune information client disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations du client
            </CardTitle>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Client Type */}
            <div className="space-y-2">
              <Label htmlFor="client_type">Type de client</Label>
              {isEditing ? (
                <Select
                  value={clientInfo.client_type}
                  onValueChange={(value) =>
                    setClientInfo({ ...clientInfo, client_type: value as ClientInfo['client_type'] })
                  }
                >
                  <SelectTrigger id="client_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="locataire">Locataire</SelectItem>
                    <SelectItem value="proprietaire">Propriétaire</SelectItem>
                    <SelectItem value="proprietaire_non_occupant">
                      Propriétaire non occupant
                    </SelectItem>
                    <SelectItem value="professionnel">Professionnel</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary">{getClientTypeLabel(clientInfo.client_type)}</Badge>
              )}
            </div>

            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                value={clientInfo.nom}
                onChange={(e) => setClientInfo({ ...clientInfo, nom: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {/* Prénom */}
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom</Label>
              <Input
                id="prenom"
                value={clientInfo.prenom}
                onChange={(e) => setClientInfo({ ...clientInfo, prenom: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                type="tel"
                value={clientInfo.telephone}
                onChange={(e) => setClientInfo({ ...clientInfo, telephone: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {/* Email */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={clientInfo.email}
                onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {/* Adresse client */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="adresse_client">Adresse du client</Label>
              <Input
                id="adresse_client"
                value={clientInfo.adresse_client}
                onChange={(e) =>
                  setClientInfo({ ...clientInfo, adresse_client: e.target.value })
                }
                disabled={!isEditing}
              />
            </div>

            {/* Adresse sinistre */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="adresse_sinistre">Adresse du sinistre</Label>
              <Input
                id="adresse_sinistre"
                value={clientInfo.adresse_sinistre}
                onChange={(e) =>
                  setClientInfo({ ...clientInfo, adresse_sinistre: e.target.value })
                }
                disabled={!isEditing}
              />
            </div>

            {/* Type sinistre */}
            <div className="space-y-2">
              <Label htmlFor="type_sinistre">Type de sinistre</Label>
              <Input
                id="type_sinistre"
                value={clientInfo.type_sinistre}
                onChange={(e) =>
                  setClientInfo({ ...clientInfo, type_sinistre: e.target.value })
                }
                disabled={!isEditing}
              />
            </div>

            {/* Date sinistre */}
            <div className="space-y-2">
              <Label htmlFor="date_sinistre">Date du sinistre</Label>
              <Input
                id="date_sinistre"
                type="date"
                value={clientInfo.date_sinistre || ''}
                onChange={(e) =>
                  setClientInfo({ ...clientInfo, date_sinistre: e.target.value })
                }
                disabled={!isEditing}
                placeholder={isEditing ? "Sélectionner une date" : ""}
              />
            </div>

            {/* Compagnie assurance */}
            <div className="space-y-2">
              <Label htmlFor="compagnie_assurance">Compagnie d'assurance</Label>
              <Input
                id="compagnie_assurance"
                value={clientInfo.compagnie_assurance}
                onChange={(e) =>
                  setClientInfo({ ...clientInfo, compagnie_assurance: e.target.value })
                }
                disabled={!isEditing}
              />
            </div>

            {/* Numéro police */}
            <div className="space-y-2">
              <Label htmlFor="numero_police">Numéro de police</Label>
              <Input
                id="numero_police"
                value={clientInfo.numero_police}
                onChange={(e) =>
                  setClientInfo({ ...clientInfo, numero_police: e.target.value })
                }
                disabled={!isEditing}
              />
            </div>

            {/* JDE workflow Step 2 fields */}
            <div className="space-y-2 md:col-span-2 pt-4 border-t bg-blue-50/50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm text-blue-800">📋 Origine du dossier  </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date_reception">Date de réception</Label>
                  <Input
                    id="date_reception"
                    type="date"
                    value={clientInfo.date_reception || ''}
                    onChange={(e) =>
                      setClientInfo({ ...clientInfo, date_reception: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="origine">Origine</Label>
                  {isEditing ? (
                    <Select
                      value={clientInfo.origine || ''}
                      onValueChange={(value) =>
                        setClientInfo({ ...clientInfo, origine: value })
                      }
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
                  ) : (
                    <Badge variant="secondary">{clientInfo.origine || 'Non défini'}</Badge>
                  )}
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* DBCS Specific Information Card */}
      {dossier?.world?.code === 'DBCS' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations fiche DBCS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* NOM - PRENOM OU NOM DE LA SOCIETE */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nom_societe">NOM - PRENOM OU NOM DE LA SOCIETE</Label>
                <Input
                  id="nom_societe"
                  value={clientInfo.nom_societe || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, nom_societe: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              {/* ADRESSE DE FACTURATION SINISTRE */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="adresse_facturation">ADRESSE DE FACTURATION SINISTRE</Label>
                <Input
                  id="adresse_facturation"
                  value={clientInfo.adresse_facturation || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, adresse_facturation: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              {/* ADRESSE DE REALISATION DES TRAVAUX */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="adresse_realisation_travaux">ADRESSE DE REALISATION DES TRAVAUX</Label>
                <Input
                  id="adresse_realisation_travaux"
                  value={clientInfo.adresse_realisation_travaux || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, adresse_realisation_travaux: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              {/* TRAVAUX SUITE A SINISTRE */}
              <div className="space-y-2">
                <Label htmlFor="travaux_suite_sinistre">TRAVAUX SUITE A SINISTRE</Label>
                {isEditing ? (
                  <Select
                    value={clientInfo.travaux_suite_sinistre || ''}
                    onValueChange={(value) =>
                      setClientInfo({ ...clientInfo, travaux_suite_sinistre: value as 'oui' | 'non' })
                    }
                  >
                    <SelectTrigger id="travaux_suite_sinistre">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">OUI</SelectItem>
                      <SelectItem value="non">NON</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">{clientInfo.travaux_suite_sinistre?.toUpperCase() || 'Non défini'}</Badge>
                )}
              </div>

              {/* Type de propriétaire */}
              <div className="space-y-2">
                <Label htmlFor="type_proprietaire">Type de propriétaire</Label>
                {isEditing ? (
                  <Select
                    value={clientInfo.type_proprietaire || ''}
                    onValueChange={(value) =>
                      setClientInfo({ ...clientInfo, type_proprietaire: value as 'proprietaire' | 'proprietaire_non_occupant' | 'exploitant' })
                    }
                  >
                    <SelectTrigger id="type_proprietaire">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proprietaire">Propriétaire</SelectItem>
                      <SelectItem value="proprietaire_non_occupant">Propriétaire non occupant</SelectItem>
                      <SelectItem value="exploitant">Exploitant</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">
                    {clientInfo.type_proprietaire === 'proprietaire' ? 'Propriétaire' :
                     clientInfo.type_proprietaire === 'proprietaire_non_occupant' ? 'Propriétaire non occupant' :
                     clientInfo.type_proprietaire === 'exploitant' ? 'Exploitant' : 'Non défini'}
                  </Badge>
                )}
              </div>

              {/* ORIGINE DU DOSSIER */}
              <div className="space-y-2">
                <Label htmlFor="origine_dossier">ORIGINE DU DOSSIER</Label>
                {isEditing ? (
                  <Select
                    value={clientInfo.origine_dossier || ''}
                    onValueChange={(value) =>
                      setClientInfo({ ...clientInfo, origine_dossier: value as 'jde' | 'nle' | 'autres' })
                    }
                  >
                    <SelectTrigger id="origine_dossier">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jde">JDE</SelectItem>
                      <SelectItem value="nle">NLE</SelectItem>
                      <SelectItem value="autres">AUTRES</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">{clientInfo.origine_dossier?.toUpperCase() || 'Non défini'}</Badge>
                )}
              </div>

              {/* Numéro de dossier si JDE - conditional */}
              {clientInfo.origine_dossier === 'jde' && (
                <div className="space-y-2">
                  <Label htmlFor="numero_dossier_jde">Numéro de dossier si JDE</Label>
                  <Input
                    id="numero_dossier_jde"
                    value={clientInfo.numero_dossier_jde || ''}
                    onChange={(e) =>
                      setClientInfo({ ...clientInfo, numero_dossier_jde: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
              )}

              {/* REFERENCES DEVIS TRAVAUX */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="references_devis_travaux">REFERENCES DEVIS TRAVAUX</Label>
                <Input
                  id="references_devis_travaux"
                  value={clientInfo.references_devis_travaux || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, references_devis_travaux: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              {/* NATURE DES TRAVAUX */}
              <div className="space-y-2">
                <Label htmlFor="nature_travaux">NATURE DES TRAVAUX</Label>
                {isEditing ? (
                  <Select
                    value={clientInfo.nature_travaux || ''}
                    onValueChange={(value) =>
                      setClientInfo({ ...clientInfo, nature_travaux: value as 'renovation' | 'reconstruction' })
                    }
                  >
                    <SelectTrigger id="nature_travaux">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="renovation">RENOVATION</SelectItem>
                      <SelectItem value="reconstruction">RECONSTRUCTION</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">{clientInfo.nature_travaux?.toUpperCase() || 'Non défini'}</Badge>
                )}
              </div>

              {/* Permis construire - conditional */}
              {clientInfo.nature_travaux === 'reconstruction' && (
                <div className="space-y-2">
                  <Label htmlFor="numero_permis_construire">Si reconstruction PERMIS DE CONSTRUIRE N°</Label>
                  <Input
                    id="numero_permis_construire"
                    value={clientInfo.numero_permis_construire || ''}
                    onChange={(e) =>
                      setClientInfo({ ...clientInfo, numero_permis_construire: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
              )}

              {/* Déclaration préalable - conditional */}
              {clientInfo.nature_travaux === 'renovation' && (
                <div className="space-y-2">
                  <Label htmlFor="numero_declaration_prealable">Si rénovation DECLARATION PREALABLE DE TRAVAUX N°</Label>
                  <Input
                    id="numero_declaration_prealable"
                    value={clientInfo.numero_declaration_prealable || ''}
                    onChange={(e) =>
                      setClientInfo({ ...clientInfo, numero_declaration_prealable: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
              )}

              {/* BRANCHEMENT PROVISOIRE */}
              <div className="space-y-2">
                <Label htmlFor="branchement_provisoire">BRANCHEMENT PROVISOIRE</Label>
                {isEditing ? (
                  <Select
                    value={clientInfo.branchement_provisoire || ''}
                    onValueChange={(value) =>
                      setClientInfo({ ...clientInfo, branchement_provisoire: value as 'oui' | 'non' })
                    }
                  >
                    <SelectTrigger id="branchement_provisoire">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">OUI</SelectItem>
                      <SelectItem value="non">NON</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">{clientInfo.branchement_provisoire?.toUpperCase() || 'Non défini'}</Badge>
                )}
              </div>

              {/* OCCUPATION DE VOIRIE */}
              <div className="space-y-2">
                <Label htmlFor="occupation_voirie">OCCUPATION DE VOIRIE</Label>
                {isEditing ? (
                  <Select
                    value={clientInfo.occupation_voirie || ''}
                    onValueChange={(value) =>
                      setClientInfo({ ...clientInfo, occupation_voirie: value as 'oui' | 'non' })
                    }
                  >
                    <SelectTrigger id="occupation_voirie">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">OUI</SelectItem>
                      <SelectItem value="non">NON</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">{clientInfo.occupation_voirie?.toUpperCase() || 'Non défini'}</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* JDMO Specific Information Card */}
      {dossier?.world?.code === 'JDMO' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations fiche JDMO</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* NOM - PRENOM OU NOM DE LA SOCIETE */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nom_societe_jdmo">NOM - PRENOM OU NOM DE LA SOCIETE</Label>
                <Input
                  id="nom_societe_jdmo"
                  value={clientInfo.nom_societe || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, nom_societe: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              {/* ADRESSE DE FACTURATION */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="adresse_facturation_jdmo">ADRESSE DE FACTURATION</Label>
                <Input
                  id="adresse_facturation_jdmo"
                  value={clientInfo.adresse_facturation || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, adresse_facturation: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              {/* ADRESSE DE REALISATION DE MISSIONS DE MAÎTRE D'ŒUVRE ET OU SPS */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="adresse_realisation_missions">ADRESSE DE REALISATION DE MISSIONS DE MAÎTRE D'ŒUVRE ET OU SPS</Label>
                <Input
                  id="adresse_realisation_missions"
                  value={clientInfo.adresse_realisation_missions || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, adresse_realisation_missions: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              {/* TEL */}
              <div className="space-y-2">
                <Label htmlFor="telephone_jdmo">TEL</Label>
                <Input
                  id="telephone_jdmo"
                  type="tel"
                  value={clientInfo.telephone || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, telephone: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              {/* MO SUITE A SINISTRE */}
              <div className="space-y-2">
                <Label htmlFor="travaux_suite_sinistre_jdmo">MO SUITE A SINISTRE</Label>
                {isEditing ? (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="travaux_suite_sinistre_jdmo"
                        value="oui"
                        checked={clientInfo.travaux_suite_sinistre === 'oui'}
                        onChange={(e) =>
                          setClientInfo({ ...clientInfo, travaux_suite_sinistre: e.target.value as 'oui' | 'non' })
                        }
                      />
                      OUI
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="travaux_suite_sinistre_jdmo"
                        value="non"
                        checked={clientInfo.travaux_suite_sinistre === 'non'}
                        onChange={(e) =>
                          setClientInfo({ ...clientInfo, travaux_suite_sinistre: e.target.value as 'oui' | 'non' })
                        }
                      />
                      NON
                    </label>
                  </div>
                ) : (
                  <Badge variant="secondary">{clientInfo.travaux_suite_sinistre?.toUpperCase() || 'Non défini'}</Badge>
                )}
              </div>

              {/* Mail */}
              <div className="space-y-2">
                <Label htmlFor="email_jdmo">Mail</Label>
                <Input
                  id="email_jdmo"
                  type="email"
                  value={clientInfo.email || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, email: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              {/* Propriétaire types */}
              <div className="space-y-2">
                <Label>Type de propriétaire</Label>
                {isEditing ? (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="type_proprietaire_jdmo"
                        value="proprietaire"
                        checked={clientInfo.type_proprietaire === 'proprietaire'}
                        onChange={(e) =>
                          setClientInfo({ ...clientInfo, type_proprietaire: e.target.value as 'proprietaire' | 'proprietaire_non_occupant' | 'exploitant' })
                        }
                      />
                      Propriétaire
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="type_proprietaire_jdmo"
                        value="proprietaire_non_occupant"
                        checked={clientInfo.type_proprietaire === 'proprietaire_non_occupant'}
                        onChange={(e) =>
                          setClientInfo({ ...clientInfo, type_proprietaire: e.target.value as 'proprietaire' | 'proprietaire_non_occupant' | 'exploitant' })
                        }
                      />
                      Propriétaire non occupant
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="type_proprietaire_jdmo"
                        value="exploitant"
                        checked={clientInfo.type_proprietaire === 'exploitant'}
                        onChange={(e) =>
                          setClientInfo({ ...clientInfo, type_proprietaire: e.target.value as 'proprietaire' | 'proprietaire_non_occupant' | 'exploitant' })
                        }
                      />
                      Exploitant
                    </label>
                  </div>
                ) : (
                  <Badge variant="secondary">
                    {clientInfo.type_proprietaire === 'proprietaire' ? 'Propriétaire' :
                     clientInfo.type_proprietaire === 'proprietaire_non_occupant' ? 'Propriétaire non occupant' :
                     clientInfo.type_proprietaire === 'exploitant' ? 'Exploitant' : 'Non défini'}
                  </Badge>
                )}
              </div>

              {/* ORIGINE DU DOSSIER */}
              <div className="space-y-2">
                <Label htmlFor="origine_dossier_jdmo">ORIGINE DU DOSSIER</Label>
                {isEditing ? (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="origine_dossier_jdmo"
                        value="jde"
                        checked={clientInfo.origine_dossier === 'jde'}
                        onChange={(e) =>
                          setClientInfo({ ...clientInfo, origine_dossier: e.target.value as 'jde' | 'nle' | 'autres' })
                        }
                      />
                      JDE
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="origine_dossier_jdmo"
                        value="nle"
                        checked={clientInfo.origine_dossier === 'nle'}
                        onChange={(e) =>
                          setClientInfo({ ...clientInfo, origine_dossier: e.target.value as 'jde' | 'nle' | 'autres' })
                        }
                      />
                      NLE
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="origine_dossier_jdmo"
                        value="autres"
                        checked={clientInfo.origine_dossier === 'autres'}
                        onChange={(e) =>
                          setClientInfo({ ...clientInfo, origine_dossier: e.target.value as 'jde' | 'nle' | 'autres' })
                        }
                      />
                      AUTRES
                    </label>
                  </div>
                ) : (
                  <Badge variant="secondary">{clientInfo.origine_dossier?.toUpperCase() || 'Non défini'}</Badge>
                )}
              </div>

              {/* Numéro de dossier si JDE - conditional */}
              {clientInfo.origine_dossier === 'jde' && (
                <div className="space-y-2">
                  <Label htmlFor="numero_dossier_jde_jdmo">Numéro de dossier si JDE</Label>
                  <Input
                    id="numero_dossier_jde_jdmo"
                    value={clientInfo.numero_dossier_jde || ''}
                    onChange={(e) =>
                      setClientInfo({ ...clientInfo, numero_dossier_jde: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
              )}

              {/* REFERENCES DEVIS TRAVAUX */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="references_devis_travaux_jdmo">REFERENCES DEVIS TRAVAUX</Label>
                <Input
                  id="references_devis_travaux_jdmo"
                  value={clientInfo.references_devis_travaux || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, references_devis_travaux: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              {/* NATURE DES TRAVAUX */}
              <div className="space-y-2">
                <Label htmlFor="nature_travaux_jdmo">NATURE DES TRAVAUX</Label>
                {isEditing ? (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="nature_travaux_jdmo"
                        value="renovation"
                        checked={clientInfo.nature_travaux === 'renovation'}
                        onChange={(e) =>
                          setClientInfo({ ...clientInfo, nature_travaux: e.target.value as 'renovation' | 'reconstruction' })
                        }
                      />
                      RENOVATION
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="nature_travaux_jdmo"
                        value="reconstruction"
                        checked={clientInfo.nature_travaux === 'reconstruction'}
                        onChange={(e) =>
                          setClientInfo({ ...clientInfo, nature_travaux: e.target.value as 'renovation' | 'reconstruction' })
                        }
                      />
                      RECONSTRUCTION
                    </label>
                  </div>
                ) : (
                  <Badge variant="secondary">{clientInfo.nature_travaux?.toUpperCase() || 'Non défini'}</Badge>
                )}
              </div>

              {/* Permis construire - conditional */}
              {clientInfo.nature_travaux === 'reconstruction' && (
                <div className="space-y-2">
                  <Label htmlFor="numero_permis_construire_jdmo">Si reconstruction PERMIS DE CONSTRUIRE N°</Label>
                  <Input
                    id="numero_permis_construire_jdmo"
                    value={clientInfo.numero_permis_construire || ''}
                    onChange={(e) =>
                      setClientInfo({ ...clientInfo, numero_permis_construire: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
              )}

              {/* Déclaration préalable - conditional */}
              {clientInfo.nature_travaux === 'renovation' && (
                <div className="space-y-2">
                  <Label htmlFor="numero_declaration_prealable_jdmo">Si rénovation DECLARATION PREALABLE DE TRAVAUX N°</Label>
                  <Input
                    id="numero_declaration_prealable_jdmo"
                    value={clientInfo.numero_declaration_prealable || ''}
                    onChange={(e) =>
                      setClientInfo({ ...clientInfo, numero_declaration_prealable: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
              )}

              {/* MODIFICATION DE PLAN */}
              <div className="space-y-2">
                <Label htmlFor="modification_plan_jdmo">MODIFICATION DE PLAN</Label>
                {isEditing ? (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="modification_plan_jdmo"
                        value="oui"
                        checked={clientInfo.modification_plan === 'oui'}
                        onChange={(e) =>
                          setClientInfo({ ...clientInfo, modification_plan: e.target.value as 'oui' | 'non' })
                        }
                      />
                      OUI
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="modification_plan_jdmo"
                        value="non"
                        checked={clientInfo.modification_plan === 'non'}
                        onChange={(e) =>
                          setClientInfo({ ...clientInfo, modification_plan: e.target.value as 'oui' | 'non' })
                        }
                      />
                      NON
                    </label>
                  </div>
                ) : (
                  <Badge variant="secondary">{clientInfo.modification_plan?.toUpperCase() || 'Non défini'}</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Landlord Information - Only for Tenants */}
      {clientInfo.client_type === 'locataire' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Coordonnées du propriétaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="proprietaire_nom">Nom</Label>
                <Input
                  id="proprietaire_nom"
                  value={clientInfo.proprietaire_nom || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, proprietaire_nom: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proprietaire_prenom">Prénom</Label>
                <Input
                  id="proprietaire_prenom"
                  value={clientInfo.proprietaire_prenom || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, proprietaire_prenom: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proprietaire_telephone">Téléphone</Label>
                <Input
                  id="proprietaire_telephone"
                  type="tel"
                  value={clientInfo.proprietaire_telephone || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, proprietaire_telephone: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proprietaire_email">Email</Label>
                <Input
                  id="proprietaire_email"
                  type="email"
                  value={clientInfo.proprietaire_email || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, proprietaire_email: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="proprietaire_adresse">Adresse</Label>
                <Input
                  id="proprietaire_adresse"
                  value={clientInfo.proprietaire_adresse || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, proprietaire_adresse: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientInfoTab;
