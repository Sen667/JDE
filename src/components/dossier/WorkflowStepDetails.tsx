import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowRight,
  FileText,
  Upload,
  X,
  Download,
  Eye,
  Mic,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import WorkflowStepForm from './WorkflowStepForm';
import { DecisionStepForm } from './DecisionStepForm';
import { AppointmentPlanningStep } from './AppointmentPlanningStep';
import { FieldVisitStep } from './FieldVisitStep';
import { CourrierGenerationStep } from './CourrierGenerationStep';
import CreateTaskDialog from '../CreateTaskDialog';
import { dossierAPI } from '@/integrations/laravel/api';
import { toast } from 'sonner';

interface WorkflowStepDetailsProps {
  step: any;
  progress: any;
  onComplete: (stepId: string, formData?: Record<string, any> | FormData) => void;
  onDecision: (stepId: string, decision: boolean, notes: string, formData?: Record<string, any> | FormData) => void;
  isSubmitting: boolean;
  nextSteps: any;
  onClose: () => void;
  onRollback?: (stepId: string) => void;
}

const WorkflowStepDetails = ({
  step,
  progress,
  onComplete,
  onDecision,
  isSubmitting,
  nextSteps,
  onClose,
  onRollback,
}: WorkflowStepDetailsProps) => {
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [savedFormData, setSavedFormData] = useState<Record<string, any>>(() => {
    if (progress?.form_data) {
      try {
        // form_data might be a JSON string from the database
        const parsed = typeof progress.form_data === 'string'
          ? JSON.parse(progress.form_data)
          : progress.form_data;

        // Convert date strings to Date objects for form validation
        if (parsed && typeof parsed === 'object') {
          // Convert date fields to Date objects
          if (parsed.date_sinistre && typeof parsed.date_sinistre === 'string') {
            try {
              parsed.date_sinistre = new Date(parsed.date_sinistre);
            } catch (e) {
              console.warn('Failed to parse date_sinistre:', parsed.date_sinistre);
            }
          }
        }

        return parsed;
      } catch (e) {
        console.warn('Failed to parse form_data:', e);
        return {};
      }
    }
    return {};
  });
  const [stepDocuments, setStepDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [documentUploadOpen, setDocumentUploadOpen] = useState(false);
  const [stepTasks, setStepTasks] = useState<any[]>([]);
  const [stepUploadedDocuments, setStepUploadedDocuments] = useState<any[]>([]);
  const [formSubmittedForDecision, setFormSubmittedForDecision] = useState(() => {
    // Initialize based on step status - if step is in progress and requires decision,
    // it means form was already submitted and we should show decision form
    return step.requires_decision && progress?.status === 'in_progress';
  });

  // Rollback state
  const [canRollback, setCanRollback] = useState(false);
  const [rollbackHistory, setRollbackHistory] = useState<any>(null);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [rollbackReason, setRollbackReason] = useState('');
  const [rollbackLoading, setRollbackLoading] = useState(false);

  // Check for JDMO transfer and pre-populate form data for Step 23
  useEffect(() => {
    const checkJDMOTransfer = async () => {
      if (step.step_number === 23 && progress?.dossier_id) {
        try {
          const transferHistory = await dossierAPI.getDossierTransferHistory(progress.dossier_id);
          const transfers = transferHistory.transfers || [];

          // Check if there was a transfer from JDMO to DBCS
          const jdmoTransfer = transfers.find((transfer: any) =>
            transfer.source_world?.code === 'JDMO' && transfer.target_world?.code === 'DBCS'
          );

          if (jdmoTransfer) {
            // Pre-populate the form with transfer information
            const transferRef = jdmoTransfer.source_dossier_id || jdmoTransfer.id;
            setSavedFormData(prev => ({
              ...prev,
              transfere_de_jdmo: true,
              numero_jdmo: transferRef.toString()
            }));
          }
        } catch (error) {
          console.error('Error checking JDMO transfer:', error);
        }
      }
    };

    checkJDMOTransfer();
  }, [step.step_number, progress?.dossier_id]);

  // Check rollback eligibility
  useEffect(() => {
    const checkRollbackEligibility = async () => {
      if (progress?.dossier_id && step?.id && progress?.status === 'completed') {
        try {
          const result = await dossierAPI.canRollbackStep(progress.dossier_id, step.id);
          setCanRollback(result.can_rollback || false);

          // Also get rollback history
          const history = await dossierAPI.getStepRollbackHistory(progress.dossier_id, step.id);
          setRollbackHistory(history);
        } catch (error) {
          console.error('Error checking rollback eligibility:', error);
          setCanRollback(false);
        }
      } else {
        setCanRollback(false);
      }
    };

    checkRollbackEligibility();
  }, [progress?.dossier_id, step?.id, progress?.status]);

  // Handle rollback
  const handleRollback = async () => {
    if (!rollbackReason.trim()) {
      toast.error('Veuillez fournir une raison pour le rollback');
      return;
    }

    setRollbackLoading(true);
    try {
      await dossierAPI.rollbackWorkflowStep(progress.dossier_id, step.id, {
        reason: rollbackReason.trim()
      });

      toast.success('Étape rollbackée avec succès');
      setRollbackDialogOpen(false);
      setRollbackReason('');

      // Notify parent component
      if (onRollback) {
        onRollback(step.id);
      }

      // Close the step details
      onClose();
    } catch (error: any) {
      console.error('Error rolling back step:', error);
      toast.error(error.response?.data?.message || 'Erreur lors du rollback');
    } finally {
      setRollbackLoading(false);
    }
  };
  const canInteract = progress?.status !== 'completed';

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      completed: { variant: 'default', label: 'Complété' },
      in_progress: { variant: 'secondary', label: 'En cours' },
      pending: { variant: 'outline', label: 'En attente' },
      blocked: { variant: 'destructive', label: 'Bloqué' },
    };
    return statusMap[status] || statusMap.pending;
  };

  const statusInfo = getStatusInfo(progress?.status || 'pending');

  // Fetch documents for this workflow step
  const fetchStepDocuments = async () => {
    if (!step?.id) return;

    try {
      setDocumentsLoading(true);
      // Get dossier ID from progress (assuming progress has dossier_id)
      const dossierId = progress?.dossier_id;

      if (!dossierId) {
        console.warn('No dossier ID available for fetching step documents');
        return;
      }

      const attachmentsResponse = await dossierAPI.getAttachments(dossierId);
      const allAttachments = attachmentsResponse.attachments || [];

      // Filter documents linked to this workflow step
      const stepDocs = allAttachments.filter((doc: any) => doc.workflow_step_id === step.id);
      setStepDocuments(stepDocs);
    } catch (error) {
      console.error('Error fetching step documents:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Fetch documents when component mounts or when step changes
  useEffect(() => {
    fetchStepDocuments();
  }, [step?.id, progress?.dossier_id]);

  // Handle document download
  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    try {
      const response = await dossierAPI.downloadAttachment(progress?.dossier_id, documentId);
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  // Handle document preview (for PDFs, images, and audio)
  const handlePreviewDocument = async (documentId: string, fileName: string, fileType: string) => {
    try {
      if (fileType === 'application/pdf' || fileType.startsWith('image/')) {
        const response = await dossierAPI.previewAttachment(progress?.dossier_id, documentId);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        window.open(url, '_blank');
      } else if (fileType.startsWith('audio/')) {
        // Create audio preview modal
        const response = await dossierAPI.previewAttachment(progress?.dossier_id, documentId);
        const url = window.URL.createObjectURL(new Blob([response.data]));

        // Create audio preview dialog
        const audioDialog = document.createElement('div');
        audioDialog.innerHTML = `
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="audio-preview-modal">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${fileName}</h3>
                <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onclick="this.closest('#audio-preview-modal').remove()">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              <audio controls class="w-full" autoplay>
                <source src="${url}" type="${fileType}">
                Votre navigateur ne supporte pas l'élément audio.
              </audio>
            </div>
          </div>
        `;
        document.body.appendChild(audioDialog);

        // Clean up URL when modal is closed
        const modal = audioDialog.querySelector('#audio-preview-modal');
        if (modal) {
          modal.addEventListener('click', (e) => {
            if (e.target === modal) {
              window.URL.revokeObjectURL(url);
              audioDialog.remove();
            }
          });
        }
      } else {
        toast.info('Prévisualisation non disponible pour ce type de fichier');
      }
    } catch (error) {
      console.error('Error previewing document:', error);
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to check if an object contains files
  const checkForFilesInObject = (obj: any): boolean => {
    if (obj instanceof File) {
      return true;
    }
    if (Array.isArray(obj)) {
      return obj.some(item => checkForFilesInObject(item));
    }
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(value => checkForFilesInObject(value));
    }
    return false;
  };

  // Helper function to determine which component to render based on metadata
  const getStepComponentType = () => {
    let metadata = step.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        metadata = {};
      }
    }

    if (metadata && typeof metadata === 'object') {
      console.log('Step metadata:', metadata); // Debug log
      if (metadata.appointment_creation) {
        return 'appointment';
      }
      if (metadata.task_creation_button) {
        console.log('Found task_creation_button, returning task_creation'); // Debug log
        return 'task_creation';
      }
      if (metadata.excel_upload) {
        return 'excel';
      }
      if (metadata.audio_upload) {
        return 'audio_upload';
      }
      if (metadata.document_upload) {
        return 'document_upload';
      }
    }
    return null;
  };

  return (
    <div className="animate-slide-in-up">
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Étape {step.step_number}
                </span>
                <CardTitle className="text-2xl">{step.name}</CardTitle>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                {canRollback && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRollbackDialogOpen(true)}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Rollback
                  </Button>
                )}
              </div>
              {step.description && (
                <p className="text-muted-foreground">{step.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Show branches if decision step */}
              {step.requires_decision && (nextSteps.yes || nextSteps.no) && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-semibold">Chemins possibles :</p>
                  {nextSteps.yes && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <ArrowRight className="h-4 w-4" />
                      <span className="text-sm">Si Oui → {nextSteps.yes.name}</span>
                    </div>
                  )}
                  {nextSteps.no && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <ArrowRight className="h-4 w-4" />
                      <span className="text-sm">Si Non → {nextSteps.no.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Show next step if linear */}
              {!step.requires_decision && nextSteps.next && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowRight className="h-4 w-4" />
                    <span>Étape suivante : <span className="font-semibold">{nextSteps.next.name}</span></span>
                  </div>
                </div>
              )}

              {canInteract ? (
                <div className="space-y-4">
                  {/* Client creation step - always show form with pre-populated data */}
                  {(() => {
                    console.log('=== CHECKING STEP CONDITION ===');
                    console.log('Full step object:', step);
                    console.log('step.step_number:', step.step_number, 'step.order:', step.order);
                    console.log('step.name:', step.name, '=== Création du client?', step.name === 'Création du client');

                    // Use order instead of step_number since that's what the API returns
                    const stepNumber = step.step_number || step.order;
                    console.log('Using step number:', stepNumber, '=== 1?', stepNumber === 1);
                    console.log('Combined condition:', stepNumber === 1 && step.name === 'Création du client');

                    return stepNumber === 1 && step.name === 'Création du client';
                  })() ? (
                    <div className="space-y-6">
                      {/* Show client info if it exists */}
                      {progress?.dossier?.clientInfo && (
                        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-3">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">Client déjà associé au dossier</span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <p><strong>Nom:</strong> {progress.dossier.clientInfo.nom} {progress.dossier.clientInfo.prenom}</p>
                            <p><strong>Email:</strong> {progress.dossier.clientInfo.email || 'Non spécifié'}</p>
                            <p><strong>Téléphone:</strong> {progress.dossier.clientInfo.telephone || 'Non spécifié'}</p>
                            <p><strong>Adresse:</strong> {progress.dossier.clientInfo.adresse_sinistre || 'Non spécifiée'}</p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-3">
                            Les informations ci-dessous sont pré-remplies. Vous pouvez les modifier avant de valider.
                          </p>
                        </div>
                      )}

                      {/* Client creation form - always shown */}
                      <div className="space-y-4">
                        <h4 className="font-semibold">Informations du client</h4>
                        <WorkflowStepForm
                          formFields={step.form_fields}
                          initialData={savedFormData}
                          onSubmit={(data) => {
                            console.log('=== WORKFLOW STEP FORM SUBMIT ===');
                            console.log('Step ID:', step.id);
                            console.log('Form data:', data);
                            console.log('Calling onComplete with:', step.id, data);
                            setSavedFormData(data);
                            onComplete(step.id, data);
                          }}
                          submitLabel="Valider le client"
                          isLoading={isSubmitting}
                        />
                      </div>
                    </div>
                  ) : step.step_number === 6 || step.name === 'Planification reconnaissance' ? (
                    <AppointmentPlanningStep
                      dossierId={progress?.dossier_id}
                      workflowStepId={step.id}
                      onComplete={(formData) => onComplete(step.id, formData)}
                      isSubmitting={isSubmitting}
                    />
                  ) : step.step_number === 7 || step.name === 'Rendez-vous de reconnaissance' ? (
                    <FieldVisitStep
                      dossierId={progress?.dossier_id}
                      workflowStepId={step.id}
                      onComplete={(formData) => onComplete(step.id, formData)}
                      isSubmitting={isSubmitting}
                    />
                  ) : step.step_number === 8 || step.name === 'Édition courrier mise en cause' ? (
                    <CourrierGenerationStep
                      dossierId={progress?.dossier_id}
                      workflowStepId={step.id}
                      onComplete={(formData) => onComplete(step.id, formData)}
                      isSubmitting={isSubmitting}
                    />
                  ) : step.step_number === 16 || step.name === 'Création tâche chef d’équipe (présence RDV)' ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">Créer une tâche pour le chef d'équipe</h4>
                          <p className="text-sm text-muted-foreground">
                            Créer et assigner une tâche pour la présence au RDV compteur
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          variant="outline"
                          className="h-20 flex flex-col items-center justify-center gap-2"
                          onClick={() => setTaskDialogOpen(true)}
                        >
                          <FileText className="h-6 w-6" />
                          <span>Créer une tâche</span>
                        </Button>
                      </div>

                      {/* Show created tasks */}
                      {stepTasks.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm">Tâches créées dans cette étape</h4>
                          <div className="space-y-2">
                            {stepTasks.map((task: any, index: number) => (
                              <div key={task.id || index} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <div>
                                    <p className="text-sm font-medium">{task.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {task.priority && <span className="capitalize">{task.priority}</span>}
                                      {task.assigned_to && <span> • Assigné</span>}
                                      {task.due_date && <span> • Échéance: {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: fr })}</span>}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setStepTasks(prev => prev.filter((_, i) => i !== index))}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          onClick={() => onComplete(step.id, {
                            created_tasks: stepTasks
                          })}
                          disabled={isSubmitting || stepTasks.length === 0}
                        >
                          {isSubmitting ? 'En cours...' : 'Marquer comme complété'}
                        </Button>
                      </div>
                    </div>
                  ) : getStepComponentType() === 'appointment' ? (
                    <AppointmentPlanningStep
                      dossierId={progress?.dossier_id}
                      workflowStepId={step.id}
                      onComplete={(formData) => onComplete(step.id, formData)}
                      isSubmitting={isSubmitting}
                      showExistingAppointments={step.step_number !== 13} // Hide existing for step 13
                    />
                  ) : getStepComponentType() === 'excel' ? (
                    <FieldVisitStep
                      dossierId={progress?.dossier_id}
                      workflowStepId={step.id}
                      onComplete={(formData) => onComplete(step.id, formData)}
                      isSubmitting={isSubmitting}
                      restrictToType="documents"
                    />
                  ) : getStepComponentType() === 'audio_upload' ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">Enregistrement audio pour cette étape</h4>
                          <p className="text-sm text-muted-foreground">
                            Vous pouvez uploader un fichier audio pour cette étape
                          </p>
                        </div>
                        <div>
                          <input
                            type="file"
                            id={`step-${step.id}-audio-upload`}
                            className="hidden"
                            accept="audio/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !progress?.dossier_id) return;

                              try {
                                // Add to local state for immediate display (don't upload yet)
                                const newDoc = {
                                  id: `temp_${Date.now()}`,
                                  file_name: file.name,
                                  file_size: file.size,
                                  file_type: file.type,
                                  document_type: 'audio_recording',
                                  created_at: new Date().toISOString(),
                                  workflow_step_id: step.id,
                                  tempFile: file // Store the file for later upload
                                };
                                setStepUploadedDocuments(prev => [...prev, newDoc]);

                                toast.success('Fichier audio ajouté avec succès');
                                e.target.value = ''; // Reset the input
                              } catch (error) {
                                console.error('Error adding audio file:', error);
                                toast.error('Erreur lors de l\'ajout du fichier audio');
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`step-${step.id}-audio-upload`)?.click()}
                          >
                            <Mic className="h-4 w-4 mr-2" />
                            Ajouter un fichier audio
                          </Button>
                        </div>
                      </div>

                      {/* Show uploaded audio files */}
                      {stepUploadedDocuments.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm">Fichiers audio ajoutés dans cette étape</h4>
                          <div className="space-y-2">
                            {stepUploadedDocuments.map((doc: any, index: number) => (
                              <div key={doc.id || index} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <Mic className="h-4 w-4 text-primary" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {doc.document_type && <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>}
                                      {doc.file_size && <span> • {formatFileSize(doc.file_size)}</span>}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setStepUploadedDocuments(prev => prev.filter((_, i) => i !== index))}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {stepUploadedDocuments.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Mic className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Formats audio acceptés: MP3, WAV, M4A, etc. • Taille maximale: 50MB</p>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          onClick={async () => {
                            // Upload audio files when step is completed
                            try {
                              for (const doc of stepUploadedDocuments) {
                                if (doc.tempFile) {
                                  const formData = new FormData();
                                  formData.append('file', doc.tempFile);
                                  formData.append('document_type', 'audio_recording');
                                  formData.append('workflow_step_id', step.id);

                                  await dossierAPI.uploadAttachment(progress.dossier_id, formData);
                                }
                              }

                              onComplete(step.id, {
                                uploaded_audio_files: stepUploadedDocuments.length
                              });
                            } catch (error) {
                              console.error('Error completing step:', error);
                              toast.error('Erreur lors de la finalisation de l\'étape');
                            }
                          }}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'En cours...' : 'Marquer comme complété'}
                        </Button>
                      </div>
                    </div>
                  ) : getStepComponentType() === 'document_upload' ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">Documents pour cette étape</h4>
                          <p className="text-sm text-muted-foreground">
                            Vous pouvez uploader des documents pour cette étape
                          </p>
                        </div>
                        <div>
                          <input
                            type="file"
                            id={`step-${step.id}-document-upload`}
                            className="hidden"
                            accept="*/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !progress?.dossier_id) return;

                              try {
                                // Add to local state for immediate display (don't upload yet)
                                const newDoc = {
                                  id: `temp_${Date.now()}`,
                                  file_name: file.name,
                                  file_size: file.size,
                                  file_type: file.type,
                                  document_type: 'step_document',
                                  created_at: new Date().toISOString(),
                                  workflow_step_id: step.id,
                                  tempFile: file // Store the file for later upload
                                };
                                setStepUploadedDocuments(prev => [...prev, newDoc]);

                                toast.success('Document ajouté avec succès');
                                e.target.value = ''; // Reset the input
                              } catch (error) {
                                console.error('Error adding document:', error);
                                toast.error('Erreur lors de l\'ajout du document');
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`step-${step.id}-document-upload`)?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Ajouter un document
                          </Button>
                        </div>
                      </div>

                      {/* Show uploaded documents */}
                      {stepUploadedDocuments.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm">Documents ajoutés dans cette étape</h4>
                          <div className="space-y-2">
                            {stepUploadedDocuments.map((doc: any, index: number) => (
                              <div key={doc.id || index} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {doc.document_type && <span className="capitalize">{doc.document_type}</span>}
                                      {doc.file_size && <span> • {formatFileSize(doc.file_size)}</span>}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setStepUploadedDocuments(prev => prev.filter((_, i) => i !== index))}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {stepUploadedDocuments.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Tous types de fichiers acceptés • Taille maximale: 10MB</p>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          onClick={async () => {
                            // Upload documents when step is completed
                            try {
                              for (const doc of stepUploadedDocuments) {
                                if (doc.tempFile) {
                                  const formData = new FormData();
                                  formData.append('file', doc.tempFile);
                                  formData.append('document_type', 'step_document');
                                  formData.append('workflow_step_id', step.id);

                                  await dossierAPI.uploadAttachment(progress.dossier_id, formData);
                                }
                              }

                              onComplete(step.id, {
                                uploaded_documents: stepUploadedDocuments.length
                              });
                            } catch (error) {
                              console.error('Error completing step:', error);
                              toast.error('Erreur lors de la finalisation de l\'étape');
                            }
                          }}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'En cours...' : 'Marquer comme complété'}
                        </Button>
                      </div>
                    </div>
                  ) : getStepComponentType() === 'task_creation' ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">Actions disponibles</h4>
                          <p className="text-sm text-muted-foreground">
                            Vous pouvez créer une tâche ou uploader des documents pour cette étape
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          variant="outline"
                          className="h-20 flex flex-col items-center justify-center gap-2"
                          onClick={() => setTaskDialogOpen(true)}
                        >
                          <FileText className="h-6 w-6" />
                          <span>Créer une tâche</span>
                        </Button>

                        <Button
                          variant="outline"
                          className="h-20 flex flex-col items-center justify-center gap-2"
                          onClick={() => document.getElementById('step18-document-upload')?.click()}
                        >
                          <Upload className="h-6 w-6" />
                          <span>Uploader des documents</span>
                        </Button>
                      </div>

                      {/* Hidden file input for Step 18 */}
                      <input
                        type="file"
                        id="step18-document-upload"
                        className="hidden"
                        accept="*/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !progress?.dossier_id) return;

                          try {
                            // Add to local state for immediate display (don't upload yet)
                            const newDoc = {
                              id: `temp_${Date.now()}`,
                              file_name: file.name,
                              file_size: file.size,
                              file_type: file.type,
                              document_type: 'step_document',
                              created_at: new Date().toISOString(),
                              workflow_step_id: step.id,
                              tempFile: file // Store the file for later upload
                            };
                            setStepUploadedDocuments(prev => [...prev, newDoc]);

                            toast.success('Document ajouté avec succès');
                            e.target.value = ''; // Reset the input
                          } catch (error) {
                            console.error('Error adding document:', error);
                            toast.error('Erreur lors de l\'ajout du document');
                          }
                        }}
                      />



                      {/* Show created tasks */}
                      {stepTasks.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm">Tâches créées dans cette étape</h4>
                          <div className="space-y-2">
                            {stepTasks.map((task: any, index: number) => (
                              <div key={task.id || index} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <div>
                                    <p className="text-sm font-medium">{task.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {task.priority && <span className="capitalize">{task.priority}</span>}
                                      {task.assigned_to && <span> • Assigné</span>}
                                      {task.due_date && <span> • Échéance: {format(new Date(task.due_date), 'dd/MM/yyyy', { locale: fr })}</span>}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setStepTasks(prev => prev.filter((_, i) => i !== index))}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Show uploaded documents */}
                      {stepUploadedDocuments.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm">Documents ajoutés dans cette étape</h4>
                          <div className="space-y-2">
                            {stepUploadedDocuments.map((doc: any, index: number) => (
                              <div key={doc.id || index} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {doc.document_type && <span className="capitalize">{doc.document_type}</span>}
                                      {doc.file_size && <span> • {formatFileSize(doc.file_size)}</span>}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setStepUploadedDocuments(prev => prev.filter((_, i) => i !== index))}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          onClick={() => onComplete(step.id, {
                            created_tasks: stepTasks,
                            uploaded_documents: stepUploadedDocuments
                          })}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'En cours...' : 'Marquer comme complété'}
                        </Button>
                      </div>
                    </div>
                  ) : step.form_fields && Array.isArray(step.form_fields) && step.form_fields.length > 0 ? (
            <div className="space-y-4">
              <h4 className="font-semibold">Formulaire de l'étape</h4>
              <WorkflowStepForm
                formFields={step.form_fields}
                initialData={savedFormData}
                onSubmit={async (data) => {
                  if (step.requires_decision) {
                    try {
                      // For decision steps, submit form data to save it WITHOUT completing the step
                      // Use a special API call that saves form data but doesn't complete
                      const formData = data instanceof FormData ? data : new FormData();
                      if (!(data instanceof FormData)) {
                        // Convert regular data to FormData for consistency
                        Object.keys(data).forEach(key => {
                          const value = data[key];
                          if (value instanceof File) {
                            formData.append(key, value);
                          } else if (Array.isArray(value)) {
                            value.forEach((item, index) => {
                              if (item instanceof File) {
                                formData.append(`${key}[${index}]`, item);
                              } else {
                                formData.append(`${key}[${index}]`, JSON.stringify(item));
                              }
                            });
                          } else {
                            formData.append(key, JSON.stringify(value));
                          }
                        });
                      }

                      // Add dossier_id and workflow_step_id
                      formData.append('dossier_id', progress?.dossier_id || '');
                      formData.append('workflow_step_id', step.id);

                      // Make API call to save form data without completing step
                      await dossierAPI.saveWorkflowFormData({
                        dossier_id: progress?.dossier_id || '',
                        workflow_step_id: step.id,
                        form_data: data
                      });

                      setFormSubmittedForDecision(true);
                      setSavedFormData(data);
                      toast.success("Données sauvegardées. Prenez maintenant une décision.");
                    } catch (error) {
                      console.error('Error saving form data:', error);
                      toast.error("Erreur lors de la sauvegarde des données");
                    }
                    return;
                  }
                  onComplete(step.id, data);
                }}
                submitLabel={step.requires_decision ? "Sauvegarder les données" : "Compléter l'étape"}
                isLoading={isSubmitting}
              />

                    {/* Decision Step - Show after form submission for decision steps with forms */}
                    {step.requires_decision && formSubmittedForDecision && (
                      <DecisionStepForm
                        stepName="Prendre une décision"
                        stepDescription="Sélectionnez votre décision et ajoutez des notes"
                        onSubmit={async (decision, decisionNotes) => {
                          // Form data is already saved, just send the decision
                          await onDecision(step.id, decision, decisionNotes);
                        }}
                        isSubmitting={isSubmitting}
                      />
                    )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Simple Decision Step */}
                      {step.requires_decision ? (
                        <DecisionStepForm
                          stepName={step.name}
                          stepDescription={step.description || ''}
                          onSubmit={async (decision, decisionNotes) => {
                            await onDecision(step.id, decision, decisionNotes);
                          }}
                          isSubmitting={isSubmitting}
                        />
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label>Notes (optionnel)</Label>
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Ajouter des notes..."
                              className="min-h-[100px]"
                            />
                          </div>
                          <Button
                            onClick={() => {
                              onComplete(step.id);
                            }}
                            className="w-full"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? 'En cours...' : "Marquer comme complété"}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Cette étape a déjà été complétée.
                  </p>
                  {progress?.completed_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Complété le {format(new Date(progress.completed_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      {progress.decision_taken !== null && (
                        <span className="ml-2 font-medium">
                          • Décision: {progress.decision_taken ? 'Oui' : 'Non'}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-4">
              {getStepComponentType() === 'task_creation' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Documents pour cette étape</h4>
                    <div>
                      <input
                        type="file"
                        id="document-upload"
                        className="hidden"
                        accept="*/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !progress?.dossier_id) return;

                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('document_type', 'step_document');
                            formData.append('workflow_step_id', step.id);

                            await dossierAPI.uploadAttachment(progress.dossier_id, formData);
                            toast.success('Document ajouté avec succès');
                            // Don't refresh here - documents will show in timeline after step completion
                            e.target.value = ''; // Reset the input
                          } catch (error) {
                            console.error('Error uploading document:', error);
                            toast.error('Erreur lors de l\'ajout du document');
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('document-upload')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Ajouter un document
                      </Button>
                    </div>
                  </div>

                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Les documents ajoutés apparaîtront dans la timeline après validation de l'étape</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Documents liés à cette étape</h4>
                  </div>

                  {documentsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Chargement des documents...</p>
                    </div>
                  ) : stepDocuments.length > 0 ? (
                    <div className="space-y-3">
                      {stepDocuments.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                          <div className="flex items-center gap-3">
                            {doc.file_type?.startsWith('audio/') ? (
                              <Mic className="h-5 w-5 text-primary flex-shrink-0" />
                            ) : (
                              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.document_type && <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>}
                                {doc.document_type && doc.file_size && <span> • </span>}
                                {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                                {(doc.document_type || doc.file_size) && doc.created_at && <span> • </span>}
                                {doc.created_at && <span>{format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: fr })}</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(doc.file_type === 'application/pdf' || doc.file_type?.startsWith('image/') || doc.file_type?.startsWith('audio/')) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreviewDocument(doc.id, doc.file_name, doc.file_type)}
                                title={doc.file_type?.startsWith('audio/') ? "Écouter" : "Prévisualiser"}
                              >
                                {doc.file_type?.startsWith('audio/') ? (
                                  <Play className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc.id, doc.file_name)}
                              title="Télécharger"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucun document pour cette étape</p>
                      {progress?.status === 'completed' && (
                        <p className="text-xs mt-2">Les documents générés apparaîtront ici après complétion de l'étape.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Historique des modifications</h4>
                {progress?.notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground">{progress.notes}</p>
                  </div>
                )}
                {!progress?.notes && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun historique disponible
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Task Creation Dialog */}
      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        worldId={progress?.dossier?.world_id || 'jde'}
        dossierId={progress?.dossier_id}
        workflowStepId={step.id}
        onTaskCreated={(taskData) => {
          console.log('onTaskCreated called with taskData:', taskData);
          if (taskData) {
            // Add the created task to local state for display
            setStepTasks(prev => {
              const newTasks = [...prev, taskData];
              console.log('Updated stepTasks:', newTasks);
              return newTasks;
            });
          }
          toast.success('Tâche créée avec succès');
          setTaskDialogOpen(false);
        }}
      />

      {/* Rollback Confirmation Dialog */}
      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmer le rollback
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir rollbacker cette étape ? Cette action va :
            </DialogDescription>
            <div className="mt-2 ml-4 text-sm">
              <ul className="list-disc">
                <li>Remettre l'étape en statut "En attente"</li>
                <li>Effacer la date de complétion</li>
                <li>Annuler toute décision prise</li>
                <li>Marquer les documents générés comme "superseded"</li>
              </ul>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rollback-reason">Raison du rollback *</Label>
              <Textarea
                id="rollback-reason"
                placeholder="Expliquez pourquoi vous rollbackez cette étape..."
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {rollbackHistory && rollbackHistory.rollback_count > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm font-medium text-orange-800">
                  ⚠️ Cette étape a déjà été rollbackée {rollbackHistory.rollback_count} fois
                </p>
                {rollbackHistory.last_rollback && (
                  <p className="text-xs text-orange-700 mt-1">
                    Dernier rollback: {format(new Date(rollbackHistory.last_rollback.rolled_back_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRollbackDialogOpen(false)}
              disabled={rollbackLoading}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleRollback}
              disabled={rollbackLoading || !rollbackReason.trim()}
            >
              {rollbackLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Rollback en cours...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Confirmer le rollback
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkflowStepDetails;
