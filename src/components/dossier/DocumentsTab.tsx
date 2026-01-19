import { useEffect, useState } from 'react';
import { dossierAPI } from '@/integrations/laravel/api';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, Upload, Download, Trash2, FileIcon, CheckSquare, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ADMIN_DOCUMENTS_CONFIG: Record<string, string[]> = {
  locataire: ['CERFA', 'BAIL', 'QUITTANCE_LOYER', 'BANQUE', 'POUVOIR', 'AUTRE'],
  proprietaire: ['CERFA', 'ATTEST_PROPRI', 'BANQUE', 'POUVOIR', 'AUTRE'],
  proprietaire_non_occupant: ['CERFA', 'ATTEST_PROPRI', 'BANQUE', 'POUVOIR', 'AUTRE'],
  professionnel: ['CERFA', 'STATUTS', 'CP_CG', 'KBIS', 'BILANS', 'BANQUE', 'POUVOIR', 'AUTRE'],
};

const DOCUMENT_LABELS: Record<string, string> = {
  CERFA: 'CERFA',
  BAIL: 'Bail',
  QUITTANCE_LOYER: 'Quittance loyer',
  ATTEST_PROPRI: 'Attest. Propri.',
  STATUTS: 'Statuts',
  CP_CG: 'CP/CG',
  KBIS: 'KBIS',
  BILANS: 'Bilans',
  BANQUE: 'Banque',
  POUVOIR: 'Pouvoir',
  AUTRE: 'Autre',
};

interface DocumentsTabProps {
  dossierId: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  document_type: string;
  uploaded_by: string;
  is_generated: boolean;
  created_at: string;
  uploader: {
    display_name: string;
  };
}

const DocumentsTab = ({ dossierId }: DocumentsTabProps) => {
  const { user } = useAuthStore();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [clientType, setClientType] = useState<string | null>(null);
  const [adminDocs, setAdminDocs] = useState<Record<string, { received: boolean; id?: string; attachment_id?: string }>>({});
  const [adminDocsLoading, setAdminDocsLoading] = useState(false);

  useEffect(() => {
    fetchAttachments();
    fetchClientType();
    fetchAdminDocuments();
  }, [dossierId]);

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/attachments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      } else {
        setAttachments([]);
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
      toast.error('Erreur lors du chargement des documents');
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientType = async () => {
    try {
      // Use Laravel API to get dossier and client info
      const dossierResult = await dossierAPI.getDossier(dossierId);
      if (dossierResult.dossier?.client_info) {
        setClientType(dossierResult.dossier.client_info.client_type);
      } else {
        setClientType('locataire');
      }
    } catch (error) {
      console.error('Error fetching client type:', error);
      setClientType('locataire');
    }
  };

  const fetchAdminDocuments = async () => {
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/administrative-documents`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const adminDocsMap: Record<string, { received: boolean; id?: string; attachment_id?: string }> = {};

        data.documents.forEach((doc: any) => {
          adminDocsMap[doc.document_type] = {
            received: doc.received,
            id: doc.id,
            attachment_id: doc.attachment_id,
          };
        });

        setAdminDocs(adminDocsMap);
      } else {
        console.warn('Failed to fetch admin documents');
        setAdminDocs({});
      }
    } catch (error) {
      console.error('Error fetching admin documents:', error);
      setAdminDocs({});
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', 'Uploaded via Documents tab');

        const response = await fetch(`/api/dossiers/${dossierId}/attachments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to upload ${file.name}`);
        }

        return response.json();
      });

      await Promise.all(uploadPromises);

      toast.success('Documents téléversés avec succès');
      fetchAttachments();
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast.error(error.message || 'Erreur lors du téléversement');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/attachments/${attachment.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        // Create blob from response and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success('Téléchargement terminé');
      } else {
        throw new Error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      // TODO: Implement Laravel file deletion API
      // await dossierAPI.deleteDossierAttachment(attachment.id);

      toast.success('Document supprimé (API implémention en attente)');
      fetchAttachments();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleAdminDocUpload = async (docType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAdminDocsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', docType);

    try {
      const response = await fetch(`/api/dossiers/${dossierId}/administrative-documents/${docType}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${DOCUMENT_LABELS[docType]} téléversé avec succès`);
        await fetchAdminDocuments();
        await fetchAttachments();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors du téléversement');
      }
    } catch (error: any) {
      console.error('Error uploading admin document:', error);
      toast.error(error.message || 'Erreur lors du téléversement');
    } finally {
      setAdminDocsLoading(false);
      event.target.value = '';
    }
  };

  const handleRemoveAdminDoc = async (docType: string) => {
    if (!confirm(`Supprimer le document ${DOCUMENT_LABELS[docType]} ?`)) return;

    try {
      const response = await fetch(`/api/dossiers/${dossierId}/administrative-documents/${docType}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Document supprimé avec succès');
        await fetchAdminDocuments();
        await fetchAttachments();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      console.error('Error removing admin document:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const groupedAttachments = attachments.reduce((acc, att) => {
    const type = att.document_type || 'Autre';
    if (!acc[type]) acc[type] = [];
    acc[type].push(att);
    return acc;
  }, {} as Record<string, Attachment[]>);

  const documentsForClientType = clientType ? ADMIN_DOCUMENTS_CONFIG[clientType] || [] : [];

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Documents et pièces jointes</CardTitle>
            <div className="relative">
              <Input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="file-upload"
              />
              <Button asChild disabled={uploading} className="bg-primary hover:bg-primary/90">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Téléversement...' : 'Ajouter des documents'}
                </label>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <div className="text-center py-12">
              <FileIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun document pour le moment</p>
              <p className="text-sm text-muted-foreground mt-2">
                Cliquez sur "Ajouter des documents" pour téléverser des fichiers
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedAttachments).map(([type, docs]) => (
                <div key={type} className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase">{type}</h4>
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doc.file_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span>
                                {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                              </span>
                              <span>•</span>
                              <span>{doc.uploader?.display_name}</span>
                            </div>
                          </div>
                          {doc.is_generated && (
                            <Badge variant="secondary" className="text-xs">
                              Généré
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {doc.uploaded_by === user?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(doc)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Documents Checklist */}
      {clientType && documentsForClientType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Documents administratifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documentsForClientType.map(docType => {
                const doc = adminDocs[docType];
                const uploadedFile = doc?.attachment_id
                  ? attachments.find(a => a.id === doc.attachment_id)
                  : null;

                // Don't show upload option if document is already uploaded
                const isAlreadyUploaded = !!uploadedFile;

                return (
                  <div key={docType} className="border rounded-lg p-3 transition-colors">
                    {uploadedFile ? (
                      // Document uploaded - show validated state
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{DOCUMENT_LABELS[docType]}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {uploadedFile.file_name}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(uploadedFile)}
                            title="Télécharger"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveAdminDoc(docType)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Document not uploaded - show upload zone
                      <label className="flex items-center gap-3 cursor-pointer hover:bg-accent/50 rounded p-1 transition-colors [&:has(input:disabled)]:cursor-not-allowed">
                        <div className="h-5 w-5 border-2 border-dashed border-muted-foreground/50 rounded flex items-center justify-center flex-shrink-0">
                          <Upload className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-sm">{DOCUMENT_LABELS[docType]}</span>
                        {isAlreadyUploaded ? (
                          <span className="text-xs text-green-600 ml-auto">Déjà téléversé</span>
                        ) : (
                          <span className="text-xs text-muted-foreground ml-auto">(cliquer pour uploader)</span>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleAdminDocUpload(docType, e)}
                          disabled={adminDocsLoading || isAlreadyUploaded}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentsTab;
