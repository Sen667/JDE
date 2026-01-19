import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, FileText, Download } from "lucide-react";
import { dossierAPI } from "@/integrations/laravel/api";
import { toast } from "sonner";

interface CourrierGenerationStepProps {
  dossierId: string;
  workflowStepId: string;
  onComplete: (formData?: Record<string, unknown>) => void;
  isSubmitting?: boolean;
}

interface ClientInfo {
  nom?: string;
  prenom?: string;
  telephone?: string;
  email?: string;
  adresse_sinistre?: string;
  type_sinistre?: string;
  date_sinistre?: string;
  compagnie_assurance?: string;
  numero_police?: string;
  proprietaire_nom?: string;
  proprietaire_prenom?: string;
}

export function CourrierGenerationStep({
  dossierId,
  workflowStepId,
  onComplete,
  isSubmitting = false
}: CourrierGenerationStepProps) {
  const [clientInfo, setClientInfo] = useState<ClientInfo>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null);

  // Form data for parameters not in client info
  const [formData, setFormData] = useState({
    ref_expert: '',
    dossier_suivi_par: '',
    assistance: '',
    assureur: '',
    assure: '',
    affaire: '',
    destinataire_nom: '',
    destinataire_adresse: '',
    destinataire_cp: '',
    destinataire_ville: ''
  });

  useEffect(() => {
    fetchClientInfo();
  }, [dossierId]);

  const fetchClientInfo = async () => {
    try {
      const response = await dossierAPI.getClientInfo(dossierId);
      setClientInfo(response.client_info || {});
    } catch (error) {
      console.error("Error fetching client info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateCourrierDocument = async () => {
    // Check if client info is available
    const hasClientInfo = clientInfo && (clientInfo.nom || clientInfo.prenom || clientInfo.adresse_sinistre);
    if (!hasClientInfo) {
      toast.error("Informations client manquantes. Veuillez d'abord saisir les informations du client dans l'onglet 'Détails du dossier'.");
      return;
    }

    // Validate required fields
    const requiredFields = [
      'ref_expert', 'dossier_suivi_par', 'assureur', 'assure', 'affaire',
      'destinataire_nom', 'destinataire_adresse', 'destinataire_cp', 'destinataire_ville'
    ];

    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]?.trim());
    if (missingFields.length > 0) {
      toast.error(`Champs requis manquants: ${missingFields.join(', ')}`);
      return;
    }

    setGenerating(true);
    try {
      // Prepare template data by combining client info and form data
      const templateData = {
        // From client info
        client_nom: clientInfo.nom || '',
        client_prenom: clientInfo.prenom || '',
        adresse_sinistre: clientInfo.adresse_sinistre || '',
        date_sinistre: clientInfo.date_sinistre || '',
        compagnie_assurance: clientInfo.compagnie_assurance || '',
        numero_contrat: clientInfo.numero_police || '',
        sinistre: clientInfo.type_sinistre || '',

        // From form data
        ref_expert: formData.ref_expert,
        dossier_suivi_par: formData.dossier_suivi_par,
        assistance: formData.assistance,
        assureur: formData.assureur,
        assure: formData.assure,
        affaire: formData.affaire,
        destinataire_nom: formData.destinataire_nom,
        destinataire_adresse: formData.destinataire_adresse,
        destinataire_cp: formData.destinataire_cp,
        destinataire_ville: formData.destinataire_ville,

        // Static data
        ref_jde: 'JDE-' + dossierId.substring(0, 8).toUpperCase(),
        logo_url: '/assets/JDE.png', // Default logo
        civilite: clientInfo.prenom ? 'M.' : 'Mme',
        nom_du_client: `${clientInfo.prenom || ''} ${clientInfo.nom || ''}`.trim(),
        date_reclamation: clientInfo.date_sinistre || new Date().toLocaleDateString('fr-FR'),
        nature_du_sinistre: clientInfo.type_sinistre || 'Sinistre non spécifié',
        date_et_heure_du_rdv: 'À définir lors de la visite terrain'
      };

      // Complete the step - the auto action will generate the document
      handleCompleteStep(templateData);

      toast.success("Étape validée - Le courrier sera généré automatiquement");

    } catch (error: any) {
      console.error("Error completing step:", error);
      toast.error(error.message || "Erreur lors de la validation de l'étape");
    } finally {
      setGenerating(false);
    }
  };

  const handleCompleteStep = (templateData: any) => {
    console.log('DEBUG: Completing step with form data', {
      formData: formData,
      templateData: templateData,
      generatedDocument: generatedDocument
    });

    // Pass the actual form data that was collected, not the template data
    const completionData = {
      // Form data that gets saved to workflow progress
      ...formData,
      // Additional metadata
      courrier_generated: true,
      template_data: templateData,
      document_url: generatedDocument
    };

    onComplete(completionData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Génération du courrier de mise en cause</h3>
          <p className="text-muted-foreground">
            Remplissez les informations manquantes et générez le courrier
          </p>
        </div>
      </div>

      {/* Client Info Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations du client (auto-remplies)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Client:</Label>
              <p className="font-medium">{clientInfo.prenom} {clientInfo.nom}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Adresse sinistre:</Label>
              <p className="font-medium">{clientInfo.adresse_sinistre || 'Non spécifiée'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Type sinistre:</Label>
              <p className="font-medium">{clientInfo.type_sinistre || 'Non spécifié'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Assurance:</Label>
              <p className="font-medium">{clientInfo.compagnie_assurance || 'Non spécifiée'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form for Missing Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations supplémentaires requises</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="ref_expert">Réf. EXPERT *</Label>
                <Input
                  id="ref_expert"
                  value={formData.ref_expert}
                  onChange={(e) => handleInputChange('ref_expert', e.target.value)}
                  placeholder="Ex: EXP-2024-001"
                />
              </div>

              <div>
                <Label htmlFor="dossier_suivi_par">Dossier suivi par *</Label>
                <Input
                  id="dossier_suivi_par"
                  value={formData.dossier_suivi_par}
                  onChange={(e) => handleInputChange('dossier_suivi_par', e.target.value)}
                  placeholder="Nom de la personne"
                />
              </div>

              <div>
                <Label htmlFor="assistance">Assistante</Label>
                <Input
                  id="assistance"
                  value={formData.assistance}
                  onChange={(e) => handleInputChange('assistance', e.target.value)}
                  placeholder="Nom de l'assistante"
                />
              </div>

              <div>
                <Label htmlFor="assureur">Assureur *</Label>
                <Input
                  id="assureur"
                  value={formData.assureur}
                  onChange={(e) => handleInputChange('assureur', e.target.value)}
                  placeholder="Nom de l'assureur"
                />
              </div>

              <div>
                <Label htmlFor="assure">Assuré *</Label>
                <Input
                  id="assure"
                  value={formData.assure}
                  onChange={(e) => handleInputChange('assure', e.target.value)}
                  placeholder="Nom de l'assuré"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="affaire">Affaire *</Label>
                <Input
                  id="affaire"
                  value={formData.affaire}
                  onChange={(e) => handleInputChange('affaire', e.target.value)}
                  placeholder="Numéro ou référence d'affaire"
                />
              </div>

              <div>
                <Label htmlFor="destinataire_nom">DESTINATAIRE *</Label>
                <Input
                  id="destinataire_nom"
                  value={formData.destinataire_nom}
                  onChange={(e) => handleInputChange('destinataire_nom', e.target.value)}
                  placeholder="Nom du destinataire"
                />
              </div>

              <div>
                <Label htmlFor="destinataire_adresse">Adresse destinataire *</Label>
                <Textarea
                  id="destinataire_adresse"
                  value={formData.destinataire_adresse}
                  onChange={(e) => handleInputChange('destinataire_adresse', e.target.value)}
                  placeholder="Adresse complète du destinataire"
                  className="min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="destinataire_cp">Code postal *</Label>
                  <Input
                    id="destinataire_cp"
                    value={formData.destinataire_cp}
                    onChange={(e) => handleInputChange('destinataire_cp', e.target.value)}
                    placeholder="75000"
                  />
                </div>
                <div>
                  <Label htmlFor="destinataire_ville">Ville *</Label>
                  <Input
                    id="destinataire_ville"
                    value={formData.destinataire_ville}
                    onChange={(e) => handleInputChange('destinataire_ville', e.target.value)}
                    placeholder="Paris"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Document Preview */}
      {generatedDocument && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Courrier généré
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Courrier de mise en cause</p>
                  <p className="text-sm text-muted-foreground">Généré avec succès</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={generatedDocument} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={generateCourrierDocument}
          disabled={generating || generatedDocument !== null}
          size="lg"
          className="gap-2"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Génération en cours...
            </>
          ) : generatedDocument ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Courrier généré
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Générer le courrier
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
