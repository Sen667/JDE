import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { dossierAPI } from "@/integrations/laravel/api";
import { toast } from "sonner";
import { User } from "lucide-react";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  workflowStepId?: string;
  onTaskCreated?: () => void;
}

export function AddTaskDialog({ open, onOpenChange, dossierId, workflowStepId, onTaskCreated }: AddTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [createAppointment, setCreateAppointment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; display_name: string; avatar_url: string | null; email: string }>>([]);

  useEffect(() => {
    if (open) {
      fetchAvailableUsers();
    }
  }, [open, dossierId]);

  const fetchAvailableUsers = async () => {
    try {
      const dossierResult = await dossierAPI.getDossier(dossierId);
      const allUsers: Array<{
        id: string;
        display_name: string;
        avatar_url: string | null;
        email: string
      }> = [];

      // Try to fetch all assignable users first (broader approach)
      try {
        const assignableUsersResponse = await fetch('/api/users/assignable', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/json',
          },
        });

        if (assignableUsersResponse.ok) {
          const assignableUsersData = await assignableUsersResponse.json();
          if (assignableUsersData?.users && assignableUsersData.users.length > 0) {
            // If assignable users are found, use them
            assignableUsersData.users.forEach((user: {
              id: string;
              display_name?: string;
              name?: string;
              email: string;
              avatar_url?: string;
              profile?: { avatar_url?: string };
            }) => {
              allUsers.push({
                id: user.id,
                display_name: user.display_name || user.name || user.email,
                avatar_url: user.avatar_url || user.profile?.avatar_url || null,
                email: user.email
              });
            });
          } else {
            // If no users found, fall back to other approaches
            throw new Error('No assignable users found');
          }
        } else {
          throw new Error('Failed to fetch assignable users');
        }
      } catch (assignableUsersError) {
        console.warn("Assignable users not available, trying world-specific approach:", assignableUsersError);

        // Fallback 1: Get current user info (always available)
        try {
          const userResponse = await fetch('/api/user', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              'Accept': 'application/json',
            },
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            allUsers.push({
              id: userData.id,
              display_name: userData.name,
              avatar_url: null, // No avatar from this endpoint
              email: userData.email
            });
          }
        } catch (userError) {
          console.warn("Could not get current user info:", userError);
        }

        // Fallback 2: Add dossier owner if different from current user
        if (dossierResult.dossier?.owner) {
          const ownerEntry = {
            id: dossierResult.dossier.owner.id,
            display_name: dossierResult.dossier.owner.display_name || dossierResult.dossier.owner.name,
            avatar_url: dossierResult.dossier.owner.avatar_url || null,
            email: dossierResult.dossier.owner.email
          };

          // Only add if not already in the list
          if (!allUsers.find(u => u.id === ownerEntry.id)) {
            allUsers.push(ownerEntry);
          }
        }
      }

      // Minimum: ensure we have at least one user (current user or owner)
      if (allUsers.length === 0) {
        console.warn("No users available for task assignment");
        // Could show a message to the user here
      }

      setUsers(allUsers);
    } catch (error) {
      console.error("Erreur chargement utilisateurs:", error);
      setUsers([]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Le titre de la tâche est requis");
      return;
    }

    setLoading(true);
    try {
      await dossierAPI.createDossierTask(dossierId, {
        title: title.trim(),
        description: description || undefined,
        priority: priority,
        assigned_to: assignedTo || undefined,
        due_date: dueDate || undefined,
        workflow_step_id: workflowStepId || undefined,
        create_appointment: createAppointment
      });

      toast.success(`Tâche créée${createAppointment ? " avec rendez-vous" : ""}`);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setAssignedTo("");
      setCreateAppointment(false);
      onOpenChange(false);
      onTaskCreated?.();
    } catch (error: unknown) {
      console.error("Erreur création tâche:", error);
      const message = error instanceof Error ? error.message : "Erreur lors de la création de la tâche";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une tâche</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la tâche"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de la tâche"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="priority">Priorité</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Basse</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="assignedTo">Assigner à</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un utilisateur" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.display_name || user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dueDate">Date d'échéance</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {dueDate && (
            <div className="flex items-center space-x-2">
              <Switch
                id="createAppointment"
                checked={createAppointment}
                onCheckedChange={setCreateAppointment}
              />
              <Label htmlFor="createAppointment" className="cursor-pointer">
                Créer un rendez-vous automatique
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Création..." : "Créer la tâche"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
