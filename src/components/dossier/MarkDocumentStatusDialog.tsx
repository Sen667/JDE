import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText } from "lucide-react";

interface Document {
  id: string;
  file_name: string;
  document_type: string | null;
}

interface AddAnnotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  workflowStepId?: string;
  onStatusMarked?: () => void;
}

export function MarkDocumentStatusDialog({ 
  open, 
  onOpenChange, 
  dossierId, 
  workflowStepId,
  onStatusMarked 
}: AddAnnotationDialogProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [status, setStatus] = useState<"received" | "pending" | "not_applicable">("received");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDocuments();
    }
  }, [open, dossierId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("dossier_attachments")
        .select("id, file_name, document_type")
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Erreur chargement documents:", error);
      toast.error("Erreur lors du chargement des documents");
    }
  };

  const handleSubmit = async () => {
    if (!selectedDoc) {
      toast.error("Veuillez sélectionner un document");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const doc = documents.find(d => d.id === selectedDoc);
      const statusLabels = {
        received: "Reçu",
        pending: "En attente",
        not_applicable: "Non applicable",
      };

      const annotationContent = `Document: ${doc?.file_name}\nStatut: ${statusLabels[status]}${comment ? `\nCommentaire: ${comment}` : ""}`;

      const { error } = await supabase
        .from("dossier_step_annotations")
        .insert({
          dossier_id: dossierId,
          workflow_step_id: workflowStepId || null,
          annotation_type: "document_status",
          title: `Statut document: ${doc?.file_name}`,
          content: annotationContent,
          metadata: {
            document_id: selectedDoc,
            status: status,
          },
          created_by: user.id,
        });

      if (error) throw error;

      toast.success("Statut du document mis à jour");
      setSelectedDoc("");
      setStatus("received");
      setComment("");
      onOpenChange(false);
      onStatusMarked?.();
    } catch (error: any) {
      console.error("Erreur mise à jour statut:", error);
      toast.error(error.message || "Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Marquer le statut d'un document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="document">Document *</Label>
            <Select value={selectedDoc} onValueChange={setSelectedDoc}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un document" />
              </SelectTrigger>
              <SelectContent>
                {documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{doc.file_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Statut *</Label>
            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="received">✅ Reçu</SelectItem>
                <SelectItem value="pending">⏳ En attente</SelectItem>
                <SelectItem value="not_applicable">❌ Non applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="comment">Commentaire (optionnel)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
