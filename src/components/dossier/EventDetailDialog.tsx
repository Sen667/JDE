import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FileText,
  MessageSquare,
  Calendar,
  ListTodo,
  StickyNote,
  User,
  Clock,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EventDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    type: "document" | "comment" | "task" | "appointment" | "annotation";
    timestamp: string;
    title: string;
    description?: string;
    status?: string;
    metadata?: any;
    createdBy?: { display_name: string; avatar_url: string | null; email: string };
    assignedTo?: { display_name: string; avatar_url: string | null; email: string };
  };
}

export function EventDetailDialog({ open, onOpenChange, event }: EventDetailDialogProps) {
  const getIcon = () => {
    switch (event.type) {
      case "document":
        return <FileText className="h-5 w-5 text-purple-500" />;
      case "comment":
        return <MessageSquare className="h-5 w-5 text-orange-500" />;
      case "task":
        return <ListTodo className="h-5 w-5 text-blue-500" />;
      case "appointment":
        return <Calendar className="h-5 w-5 text-green-500" />;
      case "annotation":
        return <StickyNote className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getTypeLabel = () => {
    switch (event.type) {
      case "document":
        return "Document";
      case "comment":
        return "Commentaire";
      case "task":
        return "Tâche";
      case "appointment":
        return "Rendez-vous";
      case "annotation":
        return "Note";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <DialogTitle className="text-xl">{event.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Type badge */}
          <div>
            <Badge variant="outline" className="text-sm">
              {getTypeLabel()}
            </Badge>
          </div>

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Description</h4>
              <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                {event.description}
              </p>
            </div>
          )}

          {/* User information */}
          {(event.createdBy || event.assignedTo) && (
            <div className="space-y-3 border-t pt-4">
              {event.createdBy && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={event.createdBy.avatar_url || ""} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.createdBy.display_name}</p>
                    <p className="text-xs text-muted-foreground">Créateur</p>
                  </div>
                </div>
              )}

              {event.assignedTo && event.type === "task" && (
                <>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={event.assignedTo.avatar_url || ""} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.assignedTo.display_name}</p>
                      <p className="text-xs text-muted-foreground">Assigné à</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Task specific details */}
          {event.type === "task" && event.metadata && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Détails de la tâche</h4>
              
              {event.metadata.priority && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Priorité:</span>
                  <Badge 
                    variant={
                      event.metadata.priority === "high" ? "destructive" :
                      event.metadata.priority === "medium" ? "default" : "secondary"
                    }
                  >
                    {event.metadata.priority === "high" ? "Haute" :
                     event.metadata.priority === "medium" ? "Moyenne" : "Basse"}
                  </Badge>
                </div>
              )}

              {event.status && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Statut:</span>
                  <Badge variant="outline">
                    {event.status === "completed" ? "Complétée" :
                     event.status === "in_progress" ? "En cours" : "En attente"}
                  </Badge>
                </div>
              )}

              {event.metadata.due_date && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Échéance: {format(new Date(event.metadata.due_date), "PPP 'à' HH:mm", { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Appointment specific details */}
          {event.type === "appointment" && event.metadata && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Détails du rendez-vous</h4>
              
              {event.status && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Statut:</span>
                  <Badge variant="outline">
                    {event.status === "confirmed" ? "Confirmé" :
                     event.status === "pending" ? "En attente" : event.status}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Document specific details */}
          {event.type === "document" && event.metadata && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Détails du document</h4>
              
              {event.metadata.document_type && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Type:</span>
                  <Badge variant="outline">{event.metadata.document_type}</Badge>
                </div>
              )}

              {event.metadata.file_size && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Taille:</span>
                  <span className="text-sm text-muted-foreground">
                    {(event.metadata.file_size / 1024).toFixed(2)} KB
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-4">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(event.timestamp), "PPP 'à' HH:mm", { locale: fr })}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
