import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { dossierAPI } from "@/integrations/laravel/api";
import { toast } from "sonner";
import { User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  workflowStepId?: string;
  onAppointmentCreated?: () => void;
}

export function AddAppointmentDialog({ 
  open, 
  onOpenChange, 
  dossierId, 
  workflowStepId, 
  onAppointmentCreated 
}: AddAppointmentDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Format current date/time for datetime-local inputs (YYYY-MM-DDTHH:MM)
  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // Account for timezone
    return now.toISOString().slice(0, 16);
  };

  const [startTime, setStartTime] = useState(() => getCurrentDateTime());
  const [endTime, setEndTime] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; display_name: string; avatar_url: string | null; email: string }>>([]);

  useEffect(() => {
    if (open) {
      fetchAvailableUsers();
    }
  }, [open, dossierId]);

  const fetchAvailableUsers = async () => {
    try {
      // Use the existing getAssignableUsers API that includes world access
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
          const userProfiles = data.users.map((user: any) => ({
            id: user.id,
            display_name: user.display_name || user.name || user.email,
            avatar_url: user.avatar_url || null,
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

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Le titre du rendez-vous est requis");
      return;
    }

    if (!startTime) {
      toast.error("La date de début est requise");
      return;
    }

    if (endTime && new Date(endTime) <= new Date(startTime)) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }

    setLoading(true);
    try {
      // Use the createDossierAppointment endpoint
      const response = await fetch(`/api/dossiers/${dossierId}/appointments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description || null,
          start_time: startTime,
          end_time: endTime || startTime, // Use same time if end not specified
          user_id: assignedTo || undefined, // Optional assignee
          workflow_step_id: workflowStepId || undefined
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      // Check if response has JSON content
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (data.message) {
          toast.success(data.message);
        } else {
          toast.success("Rendez-vous créé avec succès");
        }
      } else {
        toast.success("Rendez-vous créé avec succès");
      }

      // Reset form
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setAssignedTo("");
      onOpenChange(false);
      onAppointmentCreated?.();
    } catch (error: any) {
      console.error("Erreur création rendez-vous:", error);
      toast.error(error.message || "Erreur lors de la création du rendez-vous");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un rendez-vous</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du rendez-vous"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du rendez-vous"
              rows={3}
            />
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
            <Label htmlFor="startTime">Date et heure de début *</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="endTime">Date et heure de fin</Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Création..." : "Créer le rendez-vous"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
