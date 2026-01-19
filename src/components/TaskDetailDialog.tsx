import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle2, Edit, Save, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { dossierAPI } from '@/integrations/laravel/api';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string;
  world?: { code: string; name: string; theme_colors: any };
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  email: string;
}

export const TaskDetailDialog = ({ task, open, onOpenChange, onTaskUpdated }: TaskDetailDialogProps) => {
  const { isSuperAdmin, user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [assignedTo, setAssignedTo] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setAssignedTo(task.assigned_to);
    }
  }, [task]);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    // TODO: Implement Laravel API call for getting users
    // When ready: const result = await adminAPI.getAllUsers();
    // setUsers(result.users || []);
    setUsers([]);
  };

  const handleValidate = async () => {
    if (!task) return;

    setLoading(true);
    // TODO: Implement task validation API
    // await taskAPI.validateTask(task.id);
    toast.success('Tâche validée (API implémentation en attente)');
    onTaskUpdated();
    onOpenChange(false);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!task) return;

    setLoading(true);
    // TODO: Implement task update API
    // await taskAPI.updateTask(task.id, { title, description, priority, due_date: dueDate?.toISOString(), assigned_to: assignedTo });
    toast.success('Tâche modifiée (API implémentation en attente)');
    setIsEditing(false);
    onTaskUpdated();
    setLoading(false);
  };

  if (!task) return null;

  const getPriorityLabel = (priority: string) => {
    const labels = { urgent: 'Urgente', high: 'Élevée', medium: 'Moyenne', low: 'Basse' };
    return labels[priority as keyof typeof labels] || priority;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const canEdit = isSuperAdmin() || user?.id === task.assigned_to;
  const isOwner = user?.id === task.assigned_to;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Détails de la tâche
            {task.world && (
              <Badge style={{ backgroundColor: task.world.theme_colors?.primary }}>
                {task.world.code}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isEditing && canEdit ? (
            <>
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">Élevée</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="low">Basse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date d'échéance</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={fr} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assigné à</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.display_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-muted-foreground">Titre</Label>
                <p className="text-lg font-semibold">{task.title}</p>
              </div>

              {task.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Priorité</Label>
                  <div className="mt-1">
                    <Badge className={cn("text-xs inline-flex", getPriorityColor(task.priority))}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  </div>
                </div>

                {task.due_date && (
                  <div>
                    <Label className="text-muted-foreground">Date d'échéance</Label>
                    <p className="text-sm mt-1">
                      {format(new Date(task.due_date), 'PPP', { locale: fr })}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground">Statut</Label>
                <div className="mt-1">
                  <Badge variant={task.status === 'done' ? 'default' : 'secondary'}>
                    {task.status === 'done' ? 'Terminée' : 'À faire'}
                  </Badge>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isEditing && canEdit ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                Enregistrer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              {isOwner && task.status !== 'done' && (
                <Button onClick={handleValidate} disabled={loading} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Valider la tâche
                </Button>
              )}
              {canEdit && (
                <Button onClick={() => setIsEditing(true)} disabled={loading}>
                  Modifier
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
