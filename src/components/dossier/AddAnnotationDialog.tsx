import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dossierAPI } from "@/integrations/laravel/api";
import { toast } from "sonner";

interface AddAnnotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  workflowStepId?: string;
  onAnnotationCreated?: () => void;
}

export function AddAnnotationDialog({ 
  open, 
  onOpenChange, 
  dossierId, 
  workflowStepId, 
  onAnnotationCreated 
}: AddAnnotationDialogProps) {
  const [annotationType, setAnnotationType] = useState<"note" | "document_status" | "conversation" | "custom">("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Le titre et le contenu sont requis");
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement Laravel annotation creation API
      // await dossierAPI.createAnnotation({
      //   dossier_id: dossierId,
      //   workflow_step_id: workflowStepId,
      //   annotation_type: annotationType,
      //   title: title.trim(),
      //   content: content.trim()
      // });

      toast.success("Annotation ajoutée avec succès (API implémention en attente)");
      setTitle("");
      setContent("");
      setAnnotationType("note");
      onOpenChange(false);
      onAnnotationCreated?.();
    } catch (error: any) {
      console.error("Erreur création annotation:", error);
      toast.error(error.message || "Erreur lors de la création de l'annotation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une annotation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="type">Type d'annotation</Label>
            <Select value={annotationType} onValueChange={(value: any) => setAnnotationType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note libre</SelectItem>
                <SelectItem value="document_status">Statut document</SelectItem>
                <SelectItem value="conversation">Conversation</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de l'annotation"
            />
          </div>

          <div>
            <Label htmlFor="content">Contenu *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Décrivez votre annotation ici..."
              rows={6}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Création..." : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
