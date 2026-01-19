import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dossierAPI } from "@/integrations/laravel/api";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Save, X, FileText, MessageSquare, CheckSquare, Calendar, StickyNote, FileImage } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TimelineItem {
  id: string;
  type: "comment" | "document" | "task" | "appointment" | "annotation" | "photo";
  title: string;
  content?: string;
  fromUser: string;
  fromUserAvatar?: string;
  createdAt: string;
  metadata?: any;
  status?: string;
  priority?: string;
  dueDate?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  annotationType?: string;
  storagePath?: string;
  createdById?: string;
  uploadedById?: string;
  userId?: string;
  assignedToId?: string;
  toUser?: string;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  email: string;
}

interface UnifiedItemDialogProps {
  item: TimelineItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdated: () => void;
  currentUserId?: string;
  isSuperAdmin?: boolean;
}

export function UnifiedItemDialog({ 
  item, 
  open, 
  onOpenChange, 
  onItemUpdated,
  currentUserId,
  isSuperAdmin = false
}: UnifiedItemDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // États pour l'édition
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedStatus, setEditedStatus] = useState("");
  const [editedPriority, setEditedPriority] = useState("");
  const [editedDueDate, setEditedDueDate] = useState("");
  const [editedStartTime, setEditedStartTime] = useState("");
  const [editedEndTime, setEditedEndTime] = useState("");
  const [editedAssignedTo, setEditedAssignedTo] = useState("");

  // Function to fetch users - must be declared before useMemo that calls it
  const fetchUsers = async () => {
    try {
      // Use the existing getAssignableUsers API we created
      const response = await fetch('/api/users/assignable', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.users) {
          const userProfiles: UserProfile[] = data.users.map((user: any) => ({
            id: user.id,
            display_name: user.display_name || user.name || user.email,
            email: user.email
          }));
          setUsers(userProfiles);
        }
      }
    } catch (error) {
      console.error("Erreur chargement utilisateurs:", error);
      setUsers([]);
    }
  };

  // Fonctions de traduction
  const getStatusLabel = (status?: string): string => {
    switch (status) {
      case "todo": return "À faire";
      case "in_progress": return "En cours";
      case "done": return "Terminé";
      case "cancelled": return "Annulé";
      default: return "À faire";
    }
  };

  const getPriorityLabel = (priority?: string): string => {
    switch (priority) {
      case "low": return "Basse";
      case "medium": return "Moyenne";
      case "high": return "Haute";
      case "urgent": return "Urgente";
      default: return "Moyenne";
    }
  };

  // Initialiser les valeurs quand l'item change
  useMemo(() => {
    if (item) {
      setEditedTitle(item.title || "");
      setEditedContent(item.content || "");
      setEditedDescription(item.description || "");
      setEditedStatus(item.status || "");
      setEditedPriority(item.priority || "");
      setEditedDueDate(item.dueDate || "");
      setEditedStartTime(item.startTime || "");
      setEditedEndTime(item.endTime || "");
      setEditedAssignedTo(item.assignedToId || "");
    }
  }, [item]);

  // Charger les utilisateurs si c'est une tâche
  useMemo(() => {
    if (open && item?.type === "task") {
      fetchUsers();
    }
  }, [open, item]);

  // Vérifier les permissions
  const canEdit = useMemo(() => {
    if (!item || !currentUserId) return false;
    if (isSuperAdmin) return true;

    switch (item.type) {
      case "comment":
      case "annotation":
        return item.createdById === currentUserId;
      case "task":
        return item.createdById === currentUserId || item.assignedToId === currentUserId;
      case "appointment":
        return item.userId === currentUserId;
      case "document":
      case "photo":
        return false; // Non éditables
      default:
        return false;
    }
  }, [item, currentUserId, isSuperAdmin]);

  const canDelete = useMemo(() => {
    if (!item || !currentUserId) return false;
    if (isSuperAdmin) return true;

    switch (item.type) {
      case "comment":
      case "annotation":
        return item.createdById === currentUserId;
      case "task":
        return item.createdById === currentUserId;
      case "appointment":
        return item.userId === currentUserId;
      case "document":
      case "photo":
        return item.uploadedById === currentUserId;
      default:
        return false;
    }
  }, [item, currentUserId, isSuperAdmin]);

  const getTableName = (type: string): "dossier_comments" | "tasks" | "dossier_step_annotations" | "appointments" | "dossier_attachments" | "dossier_photos" => {
    switch (type) {
      case "comment": return "dossier_comments";
      case "task": return "tasks";
      case "annotation": return "dossier_step_annotations";
      case "appointment": return "appointments";
      case "document": return "dossier_attachments";
      case "photo": return "dossier_photos";
      default: return "dossier_comments"; // Fallback safe
    }
  };

  const handleUpdate = async () => {
    if (!item) return;

    setIsLoading(true);
    try {
      // TODO: Implement Laravel unified item update API
      // await dossierAPI.updateUnifiedItem(item.id, item.type, {
      //   title: editedTitle,
      //   content: editedContent,
      //   description: editedDescription,
      //   status: editedStatus,
      //   priority: editedPriority,
      //   due_date: editedDueDate,
      //   start_time: editedStartTime,
      //   end_time: editedEndTime,
      //   assigned_to: editedAssignedTo
      // });

      toast({
        title: "Modifié avec succès (API en attente)",
        description: "L'élément sera mis à jour."
      });

      onItemUpdated();
      setIsEditing(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de modifier l'élément"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    setIsLoading(true);
    try {
      // TODO: Implement Laravel unified item delete API
      // await dossierAPI.deleteUnifiedItem(item.id, item.type, item.storagePath);

      toast({
        title: "Supprimé avec succès (API en attente)",
        description: "L'élément sera supprimé définitivement."
      });

      onItemUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'élément"
      });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const getIcon = () => {
    switch (item?.type) {
      case "comment": return <MessageSquare className="h-5 w-5" />;
      case "task": return <CheckSquare className="h-5 w-5" />;
      case "annotation": return <StickyNote className="h-5 w-5" />;
      case "appointment": return <Calendar className="h-5 w-5" />;
      case "document": return <FileText className="h-5 w-5" />;
      case "photo": return <FileImage className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  if (!item) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {getIcon()}
              <DialogTitle>
                {isEditing && item.type !== "comment" ? (
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-lg font-semibold"
                  />
                ) : (
                  item.title
                )}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informations de base */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Créé par {item.fromUser}</span>
              <span>•</span>
              <span>{format(new Date(item.createdAt), "PPP 'à' HH:mm", { locale: fr })}</span>
            </div>

            {/* Contenu selon le type */}
            {(item.type === "comment" || item.type === "annotation") && (
              <div className="space-y-2">
                <Label>Contenu</Label>
                {isEditing ? (
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={6}
                  />
                ) : (
                  <div className="p-3 rounded-md bg-muted">
                    {item.content}
                  </div>
                )}
              </div>
            )}

            {item.type === "task" && (
              <>
                {/* Quick status change buttons - always visible for tasks */}
                <div className="space-y-2">
                  <Label>Statut rapide</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const response = await fetch(`/api/tasks/${item.id}/quick-status`, {
                            method: 'PATCH',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ status: 'todo' }),
                          });
                          if (response.ok) {
                            item.status = 'todo';
                            toast({ title: "Statut mis à jour", description: "Tâche marquée comme à faire" });
                            onItemUpdated();
                          }
                        } catch (error) {
                          toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour le statut" });
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                      className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 transition-all duration-200 ${
                        item.status === 'todo'
                          ? 'bg-slate-600 text-white border-slate-600 shadow-md ring-2 ring-slate-300'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                      } disabled:opacity-50`}
                    >
                      {item.status === 'todo' && <span className="mr-1">✓</span>}
                      À faire
                    </button>
                    <button
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const response = await fetch(`/api/tasks/${item.id}/quick-status`, {
                            method: 'PATCH',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ status: 'in_progress' }),
                          });
                          if (response.ok) {
                            item.status = 'in_progress';
                            toast({ title: "Statut mis à jour", description: "Tâche marquée comme en cours" });
                            onItemUpdated();
                          }
                        } catch (error) {
                          toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour le statut" });
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                      className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 transition-all duration-200 ${
                        item.status === 'in_progress'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                          : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400'
                      } disabled:opacity-50`}
                    >
                      {item.status === 'in_progress' && <span className="mr-1">✓</span>}
                      En cours
                    </button>
                    <button
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const response = await fetch(`/api/tasks/${item.id}/quick-status`, {
                            method: 'PATCH',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ status: 'done' }),
                          });
                          if (response.ok) {
                            item.status = 'done';
                            toast({ title: "Statut mis à jour", description: "Tâche marquée comme terminée" });
                            onItemUpdated();
                          }
                        } catch (error) {
                          toast({ variant: "destructive", title: "Erreur", description: "Impossible de mettre à jour le statut" });
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                      className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 transition-all duration-200 ${
                        item.status === 'done'
                          ? 'bg-green-600 text-white border-green-600 shadow-md ring-2 ring-green-300'
                          : 'bg-white text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400'
                      } disabled:opacity-50`}
                    >
                      {item.status === 'done' && <span className="mr-1">✓</span>}
                      Terminée
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={4}
                    />
                  ) : (
                    <div className="p-3 rounded-md bg-muted">
                      {item.content || item.description || "Aucune description"}
                    </div>
                  )}
                </div>

                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    {isEditing ? (
                      <Select value={editedStatus} onValueChange={setEditedStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">À faire</SelectItem>
                          <SelectItem value="in_progress">En cours</SelectItem>
                          <SelectItem value="done">Terminé</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-2 rounded-md bg-muted text-sm">{getStatusLabel(item.status)}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    {isEditing ? (
                      <Select value={editedPriority} onValueChange={setEditedPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Basse</SelectItem>
                          <SelectItem value="medium">Moyenne</SelectItem>
                          <SelectItem value="high">Haute</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-2 rounded-md bg-muted text-sm">{getPriorityLabel(item.priority)}</div>
                    )}
                  </div>
                </div>

                {(item.dueDate || isEditing) && (
                  <div className="space-y-2">
                    <Label>Date d'échéance</Label>
                    {isEditing ? (
                      <Input
                        type="datetime-local"
                        value={editedDueDate}
                        onChange={(e) => setEditedDueDate(e.target.value)}
                      />
                    ) : (
                      <div className="p-2 rounded-md bg-muted text-sm">
                        {item.dueDate ? format(new Date(item.dueDate), "PPP 'à' HH:mm", { locale: fr }) : "Non définie"}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Assigné à</Label>
                  {isEditing ? (
                    <Select value={editedAssignedTo} onValueChange={setEditedAssignedTo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un utilisateur" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.display_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 rounded-md bg-muted text-sm">
                      {item.toUser || "Non assignée"}
                    </div>
                  )}
                </div>
              </>
            )}

            {item.type === "appointment" && (
              <>
                <div className="space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={4}
                    />
                  ) : (
                    <div className="p-3 rounded-md bg-muted">
                      {item.description || "Aucune description"}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Début *</Label>
                    {isEditing ? (
                      <Input
                        type="datetime-local"
                        value={editedStartTime}
                        onChange={(e) => setEditedStartTime(e.target.value)}
                        required
                      />
                    ) : (
                      <div className="p-2 rounded-md bg-muted text-sm">
                        {item.startTime ? format(new Date(item.startTime), "PPP 'à' HH:mm", { locale: fr }) : "Non défini"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Fin</Label>
                    {isEditing ? (
                      <Input
                        type="datetime-local"
                        value={editedEndTime}
                        onChange={(e) => setEditedEndTime(e.target.value)}
                      />
                    ) : (
                      <div className="p-2 rounded-md bg-muted text-sm">
                        {item.endTime ? format(new Date(item.endTime), "PPP 'à' HH:mm", { locale: fr }) : "Non définie"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Planifié avec</Label>
                  <div className="p-2 rounded-md bg-muted text-sm">
                    {item.toUser || "Non assigné"}
                  </div>
                </div>
              </>
            )}

            {(item.type === "document" || item.type === "photo") && (
              <div className="p-3 rounded-md bg-muted text-sm">
                <p><strong>Type de fichier :</strong> {item.type === "document" ? "Document" : "Photo"}</p>
                {item.metadata && (
                  <p><strong>Taille :</strong> {(item.metadata.size / 1024).toFixed(2)} KB</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {!isEditing ? (
              <>
                {canEdit && (
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                )}
                {canDelete && (
                  <Button onClick={() => setShowDeleteConfirm(true)} variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                )}
                <Button onClick={() => onOpenChange(false)} variant="secondary">
                  Fermer
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setIsEditing(false)} variant="outline" disabled={isLoading}>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
                <Button onClick={handleUpdate} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
