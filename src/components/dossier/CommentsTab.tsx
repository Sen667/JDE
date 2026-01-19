import { useEffect, useState } from 'react';
import { dossierAPI } from '@/integrations/laravel/api';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CommentsTabProps {
  dossierId: string;
}

interface Comment {
  id: string;
  content: string;
  comment_type: string;
  created_at: string;
  workflow_step_id: string | null;
  metadata: any;
  user: {
    display_name: string;
    email: string;
  };
  workflow_step: {
    name: string;
    step_number: number;
  } | null;
}

const CommentsTab = ({ dossierId }: CommentsTabProps) => {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();

    // TODO: Implement Laravel real-time commentary updates
    // Real-time subscription implementation pending
  }, [dossierId]);

  const fetchComments = async () => {
    try {
      const result = await dossierAPI.getComments(dossierId);
      setComments(result.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Erreur lors du chargement des commentaires');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await dossierAPI.addComment(dossierId, {
        comment: newComment.trim(),
        comment_type: 'comment'
      });

      toast.success('Commentaire ajouté avec succès');
      setNewComment('');
      fetchComments(); // Refresh comments list
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Erreur lors de l\'ajout du commentaire');
    } finally {
      setSubmitting(false);
    }
  };

  const getCommentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      comment: 'Commentaire',
      status_change: 'Changement de statut',
      step_completed: 'Étape complétée',
      document_added: 'Document ajouté',
      decision_made: 'Décision',
    };
    return labels[type] || type;
  };

  const getCommentTypeBadgeVariant = (type: string): "default" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      comment: 'outline',
      status_change: 'secondary',
      step_completed: 'default',
      document_added: 'secondary',
      decision_made: 'default',
    };
    return variants[type] || 'outline';
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

  return (
    <div className="space-y-6">
      {/* Add comment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Ajouter un commentaire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Écrivez votre commentaire..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={4}
            />
            <Button onClick={handleSubmitComment} disabled={submitting || !newComment.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Envoyer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments list */}
      <Card>
        <CardHeader>
          <CardTitle>Historique ({comments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun commentaire pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <Avatar>
                    <AvatarFallback>
                      {comment.user?.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                   <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{comment.user?.display_name}</span>
                        <Badge variant={getCommentTypeBadgeVariant(comment.comment_type)}>
                          {getCommentTypeLabel(comment.comment_type)}
                        </Badge>
                        {comment.workflow_step && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            Étape {comment.workflow_step.step_number}: {comment.workflow_step.name}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CommentsTab;
