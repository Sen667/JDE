import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { dossierAPI } from "@/integrations/laravel/api";
import { toast } from "sonner";

interface AddCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  workflowStepId?: string;
  onCommentCreated?: () => void;
}

export function AddCommentDialog({ open, onOpenChange, dossierId, workflowStepId, onCommentCreated }: AddCommentDialogProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Le commentaire ne peut pas être vide");
      return;
    }

    setLoading(true);
    try {
      await dossierAPI.addComment(dossierId, {
        comment: content.trim(),
        comment_type: "comment",
        ...(workflowStepId && { workflow_step_id: workflowStepId })
      });

      toast.success("Commentaire ajouté avec succès");
      setContent("");
      onOpenChange(false);
      onCommentCreated?.();
    } catch (error: unknown) {
      console.error("Erreur création commentaire:", error);
      const message = error instanceof Error ? error.message : "Erreur lors de la création du commentaire";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un commentaire</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="content">Commentaire *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Votre commentaire..."
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Ajout..." : "Ajouter le commentaire"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
