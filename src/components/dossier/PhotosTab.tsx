import { useEffect, useState } from 'react';
import { dossierAPI } from '@/integrations/laravel/api';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Camera, Upload, Trash2, X, FileText, Mic, Play, Pause, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PhotosTabProps {
  dossierId: string;
}

interface Photo {
  id: string;
  file_name: string;
  file_size: number;
  storage_path: string;
  url: string; // Direct URL for preview
  caption: string | null;
  uploaded_by: string;
  created_at: string;
  taken_at: string | null;
  metadata: { type?: 'photo' | 'plan' } | null;
  uploader: {
    display_name: string;
  };
}

interface AudioFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  document_type: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  uploader: {
    display_name: string;
  };
}

interface WorkflowDocument {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  document_type: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  workflow_step_id: string | null;
  is_generated: boolean;
  uploader: {
    display_name: string;
  };
}

const PhotosTab = ({ dossierId }: PhotosTabProps) => {
  const { user } = useAuthStore();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [workflowDocuments, setWorkflowDocuments] = useState<WorkflowDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
  const [selectedWorkflowDoc, setSelectedWorkflowDoc] = useState<WorkflowDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, [dossierId]);

  useEffect(() => {
    if (selectedPhoto) {
      setPreviewUrl(selectedPhoto.url); // Use direct URL from API response
    } else {
      setPreviewUrl(null);
    }
  }, [selectedPhoto]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);

      // Fetch photos (images)
      const photosResponse = await fetch(`/api/dossiers/${dossierId}/photos`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': 'application/json',
        },
      });

      if (photosResponse.ok) {
        const photosData = await photosResponse.json();
        setPhotos(photosData.photos || []);
      } else {
        console.error('Failed to fetch photos');
        setPhotos([]);
      }

      // Fetch all attachments to get audio files and workflow documents
      const attachmentsResponse = await fetch(`/api/dossiers/${dossierId}/attachments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': 'application/json',
        },
      });

      if (attachmentsResponse.ok) {
        const attachmentsData = await attachmentsResponse.json();
        const allAttachments = attachmentsData.attachments || [];

        // Filter audio files
        const audioFiles = allAttachments.filter((attachment: AudioFile) =>
          attachment.file_type?.startsWith('audio/')
        );
        setAudioFiles(audioFiles);

        // Filter workflow-uploaded documents (those with workflow_step_id and are images)
        const workflowDocs = allAttachments.filter((attachment: WorkflowDocument) =>
          attachment.workflow_step_id &&
          attachment.file_type?.startsWith('image/') &&
          !attachment.is_generated
        );
        setWorkflowDocuments(workflowDocs);
      } else {
        console.error('Failed to fetch attachments');
        setAudioFiles([]);
        setWorkflowDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      setPhotos([]);
      setAudioFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotoPreview = async (photo: Photo) => {
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/photos/${photo.id}/preview`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewUrl(data.url); // Use the returned URL directly
      } else {
        console.error('Failed to load photo preview');
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Error loading photo preview:', error);
      setPreviewUrl(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'plan' = 'photo') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files[]', file);
      });
      formData.append('type', type);

      const response = await fetch(`/api/dossiers/${dossierId}/photos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast.success(`${files.length} ${type === 'plan' ? 'plan(s)' : 'photo(s)'} téléversé(s) avec succès`);
        fetchPhotos(); // Refresh the gallery
      } else {
        console.error('Failed to upload photos');
        toast.error('Erreur lors du téléversement');
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Erreur de réseau lors du téléversement');
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleDelete = async (photo: Photo) => {
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/photos/${photo.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        toast.success('Photo supprimée avec succès');
        setSelectedPhoto(null); // Close the preview dialog
        fetchPhotos(); // Refresh the gallery
      } else {
        console.error('Failed to delete photo');
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Erreur de réseau');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getThumbnailUrl = (photo: Photo) => {
    // Use the Laravel storage public URL directly for thumbnails
    // storage:link creates public/storage symlink, so this serves files statically
    return `/storage/${photo.storage_path}`;
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

  const photosList = photos.filter(p => !p.metadata?.type || p.metadata.type === 'photo');
  const plansList = photos.filter(p => p.metadata?.type === 'plan');

  const renderAudioGallery = (items: AudioFile[], emptyIcon: React.ReactNode, emptyText: string) => (
    <Card>
      <CardHeader>
        <CardTitle>Enregistrements audio du dossier</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-12">
            {emptyIcon}
            <p className="text-muted-foreground">{emptyText}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Les fichiers audio apparaîtront ici après téléversement
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((audio) => (
              <div
                key={audio.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Mic className="h-8 w-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{audio.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {audio.document_type && <span className="capitalize">{audio.document_type.replace('_', ' ')}</span>}
                      {audio.document_type && audio.file_size && <span> • </span>}
                      {audio.file_size && <span>{formatFileSize(audio.file_size)}</span>}
                      {(audio.document_type || audio.file_size) && audio.created_at && <span> • </span>}
                      {audio.created_at && <span>{format(new Date(audio.created_at), 'dd/MM/yyyy', { locale: fr })}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAudio(audio)}
                    title="Écouter"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = `/storage/${audio.storage_path}`;
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = audio.file_name;
                      link.click();
                    }}
                    title="Télécharger"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderGallery = (items: Photo[], emptyIcon: React.ReactNode, emptyText: string, uploadId: string, uploadType: 'photo' | 'plan') => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{uploadType === 'plan' ? 'Plans' : 'Photos'} du dossier</CardTitle>
          <div className="relative">
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileUpload(e, uploadType)}
              disabled={uploading}
              className="hidden"
              id={uploadId}
            />
            <Button asChild disabled={uploading}>
              <label htmlFor={uploadId} className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Téléversement...' : `Ajouter des ${uploadType === 'plan' ? 'plans' : 'photos'}`}
              </label>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-12">
            {emptyIcon}
            <p className="text-muted-foreground">{emptyText}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Cliquez sur "Ajouter des {uploadType === 'plan' ? 'plans' : 'photos'}" pour téléverser des images
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg border hover:border-primary transition-colors"
                onClick={() => setSelectedPhoto(item)}
              >
                <img
                  src={getThumbnailUrl(item)}
                  alt={item.caption || item.file_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <div className="text-white text-xs space-y-1 w-full">
                    <p className="font-medium truncate">{item.file_name}</p>
                    <p className="text-white/80">
                      {format(new Date(item.created_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="space-y-6">
        {/* Photos Section */}
        {renderGallery(
          photosList,
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />,
          'Aucune photo pour le moment',
          'photo-upload',
          'photo'
        )}

        {/* Plans Section */}
        {renderGallery(
          plansList,
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />,
          'Aucun plan pour le moment',
          'plan-upload',
          'plan'
        )}

        {/* Workflow Documents Section */}
        {workflowDocuments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Documents du workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {workflowDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg border hover:border-primary transition-colors"
                    onClick={() => setSelectedWorkflowDoc(doc)}
                  >
                    <img
                      src={`/storage/${doc.storage_path}`}
                      alt={doc.file_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <div className="text-white text-xs space-y-1 w-full">
                        <p className="font-medium truncate">{doc.document_type.replace('_', ' ')}</p>
                        <p className="text-white/80">
                          {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audio Section */}
        {renderAudioGallery(
          audioFiles,
          <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />,
          'Aucun enregistrement audio pour le moment'
        )}
      </div>

      {/* Photo Preview Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          {selectedPhoto && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>Aperçu de la photo: {selectedPhoto.file_name}</DialogTitle>
              </DialogHeader>
              <div className="relative">
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => setSelectedPhoto(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt={selectedPhoto.caption || selectedPhoto.file_name}
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                )}
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedPhoto.file_name}</h3>
                    {selectedPhoto.caption && (
                      <p className="text-muted-foreground mt-2">{selectedPhoto.caption}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="space-y-1">
                      <p>Uploadé par {selectedPhoto.uploader?.display_name}</p>
                      <p>
                        {format(new Date(selectedPhoto.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                      </p>
                      <p>{formatFileSize(selectedPhoto.file_size)}</p>
                    </div>
                    {selectedPhoto.uploaded_by === user?.id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(selectedPhoto)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Audio Preview Dialog */}
      <Dialog open={!!selectedAudio} onOpenChange={() => setSelectedAudio(null)}>
        <DialogContent className="max-w-md">
          {selectedAudio && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  {selectedAudio.file_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <audio controls className="w-full" autoPlay>
                  <source src={`/storage/${selectedAudio.storage_path}`} type={selectedAudio.file_type} />
                  Votre navigateur ne supporte pas l'élément audio.
                </audio>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Type:</strong> {selectedAudio.document_type?.replace('_', ' ') || 'Audio'}</p>
                  <p><strong>Taille:</strong> {formatFileSize(selectedAudio.file_size)}</p>
                  <p><strong>Uploadé:</strong> {format(new Date(selectedAudio.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
                  <p><strong>Par:</strong> {selectedAudio.uploader?.display_name}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const url = `/storage/${selectedAudio.storage_path}`;
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = selectedAudio.file_name;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedAudio(null)}>
                    Fermer
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Workflow Document Preview Dialog */}
      <Dialog open={!!selectedWorkflowDoc} onOpenChange={() => setSelectedWorkflowDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          {selectedWorkflowDoc && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>Aperçu du document: {selectedWorkflowDoc.file_name}</DialogTitle>
              </DialogHeader>
              <div className="relative">
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => setSelectedWorkflowDoc(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <img
                  src={`/storage/${selectedWorkflowDoc.storage_path}`}
                  alt={selectedWorkflowDoc.file_name}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedWorkflowDoc.document_type.replace('_', ' ')}</h3>
                    <p className="text-muted-foreground">{selectedWorkflowDoc.file_name}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="space-y-1">
                      <p>Uploadé par {selectedWorkflowDoc.uploader?.display_name}</p>
                      <p>
                        {format(new Date(selectedWorkflowDoc.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                      </p>
                      <p>{formatFileSize(selectedWorkflowDoc.file_size)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const url = `/storage/${selectedWorkflowDoc.storage_path}`;
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = selectedWorkflowDoc.file_name;
                          link.click();
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedWorkflowDoc(null)}>
                        Fermer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotosTab;
