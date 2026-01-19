import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, FileText, Upload, X, CheckCircle, Image, File, Trash2 } from "lucide-react";
import { dossierAPI } from "@/integrations/laravel/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  document_type: string;
  created_at: string;
}

interface FieldVisitStepProps {
  dossierId: string;
  workflowStepId: string;
  onComplete: (formData?: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  restrictToType?: string; // "documents" to show only Documents section
}

export function FieldVisitStep({
  dossierId,
  workflowStepId,
  onComplete,
  isSubmitting = false,
  restrictToType
}: FieldVisitStepProps) {
  const [observations, setObservations] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchUploadedFiles();
  }, [dossierId, workflowStepId]);

  const fetchUploadedFiles = async () => {
    try {
      const attachmentsResponse = await dossierAPI.getAttachments(dossierId);
      const allAttachments = attachmentsResponse.attachments || [];

      // Filter files for this workflow step
      const stepFiles = allAttachments.filter((file: UploadedFile) =>
        file.document_type === 'photos_terrain' ||
        file.document_type === 'plans_terrain' ||
        file.document_type === 'documents_terrain'
      );

      setUploadedFiles(stepFiles);
    } catch (error) {
      console.error("Error fetching uploaded files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const files = event.target.files;
    console.log('DEBUG: File upload triggered', {
      files: files,
      filesLength: files?.length,
      documentType: documentType,
      workflowStepId: workflowStepId,
      dossierId: dossierId
    });

    if (!files || files.length === 0) {
      console.log('DEBUG: No files selected');
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        console.log('DEBUG: Processing file', {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', documentType);
        formData.append('workflow_step_id', workflowStepId);

        console.log('DEBUG: FormData created', {
          hasFile: formData.has('file'),
          hasDocumentType: formData.has('document_type'),
          hasWorkflowStepId: formData.has('workflow_step_id')
        });

        await dossierAPI.uploadAttachment(dossierId, formData);
      }

      toast.success("Fichiers téléchargés avec succès");
      fetchUploadedFiles();

      // Reset input
      event.target.value = '';
    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast.error(error.message || "Erreur lors du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    try {
      await dossierAPI.deleteAttachment(dossierId, fileId);
      toast.success(`Fichier "${fileName}" supprimé avec succès`);
      fetchUploadedFiles(); // Refresh the list
    } catch (error: any) {
      console.error("Error deleting file:", error);
      toast.error(error.message || "Erreur lors de la suppression du fichier");
    }
  };

  const handleCompleteStep = () => {
    // For restricted document upload (step 10), no observations required
    if (!restrictToType && !observations.trim()) {
      toast.error("Les observations sont requises");
      return;
    }

    const formData = {
      observations: restrictToType ? '' : observations.trim(),
      uploaded_files_count: uploadedFiles.length,
      file_ids: uploadedFiles.map(f => f.id),
      restrict_to_type: restrictToType || null
    };

    onComplete(formData);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const getFileTypeLabel = (documentType: string) => {
    switch (documentType) {
      case 'photos_terrain':
        return 'Photo terrain';
      case 'plans_terrain':
        return 'Plan';
      case 'documents_terrain':
        return 'Document';
      default:
        return 'Fichier';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const photosCount = uploadedFiles.filter(f => f.document_type === 'photos_terrain').length;
  const plansCount = uploadedFiles.filter(f => f.document_type === 'plans_terrain').length;
  const documentsCount = uploadedFiles.filter(f => f.document_type === 'documents_terrain').length;

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
          <h3 className="text-lg font-semibold">
            {restrictToType === 'documents' ? 'Rapport contenu mobilier (.xlsx)' : 'Visite terrain - Photos et documents'}
          </h3>
          <p className="text-muted-foreground">
            {restrictToType === 'documents'
              ? 'Téléchargez le rapport mobilier détaillé en format Excel'
              : 'Téléchargez les photos, plans et documents de la visite terrain'
            }
          </p>
        </div>
      </div>

      {/* File Upload Sections */}
      <div className={`grid gap-6 ${restrictToType === 'documents' ? 'md:grid-cols-1' : 'md:grid-cols-3'}`}>
        {/* Show only Documents section when restricted */}
        {(!restrictToType || restrictToType === 'documents') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <File className="h-4 w-4" />
                {restrictToType === 'documents' ? 'Rapport Excel' : 'Documents'}
                {documentsCount > 0 && (
                  <Badge variant="secondary">{documentsCount}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept={restrictToType === 'documents' ? '.xlsx' : '.pdf,.doc,.docx,.xls,.xlsx'}
                  onChange={(e) => handleFileUpload(e, 'documents_terrain')}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="documents-upload"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  asChild
                >
                  <label htmlFor="documents-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Téléchargement..." : restrictToType === 'documents' ? "Ajouter fichier Excel" : "Ajouter documents"}
                  </label>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {restrictToType === 'documents'
                  ? 'Format accepté: .xlsx • Taille maximale: 10MB'
                  : 'Formats acceptés: PDF, DOC, DOCX, XLS, XLSX'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Show Photos and Plans only when not restricted */}
        {(!restrictToType || restrictToType !== 'documents') && (
          <>
            {/* Photos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Photos terrain
                  {photosCount > 0 && (
                    <Badge variant="secondary">{photosCount}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'photos_terrain')}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="photos-upload"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={uploading}
                    asChild
                  >
                    <label htmlFor="photos-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Téléchargement..." : "Ajouter photos"}
                    </label>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Formats acceptés: JPG, PNG, GIF
                </p>
              </CardContent>
            </Card>

            {/* Plans */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Plans
                  {plansCount > 0 && (
                    <Badge variant="secondary">{plansCount}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.dwg,.dxf,.jpg,.png"
                    onChange={(e) => handleFileUpload(e, 'plans_terrain')}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="plans-upload"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={uploading}
                    asChild
                  >
                    <label htmlFor="plans-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Téléchargement..." : "Ajouter plans"}
                    </label>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Formats acceptés: PDF, DWG, DXF, JPG, PNG
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fichiers téléchargés ({uploadedFiles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-2 border rounded-lg group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(file.file_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getFileTypeLabel(file.document_type)} • {formatFileSize(file.file_size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getFileTypeLabel(file.document_type)}
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer le fichier</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer le fichier "{file.file_name}" ?
                            Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteFile(file.id, file.file_name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observations - Only show for full field visit, not for restricted document upload */}
      {!restrictToType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observations de la visite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="observations">Observations *</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Décrivez vos observations de la visite terrain..."
                className="min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Step Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleCompleteStep}
          disabled={isSubmitting || (!restrictToType && !observations.trim())}
          size="lg"
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Finalisation...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              {restrictToType === 'documents'
                ? `Terminer l'étape (${uploadedFiles.length} fichier${uploadedFiles.length !== 1 ? 's' : ''})`
                : `Terminer la visite (${uploadedFiles.length} fichiers)`
              }
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
