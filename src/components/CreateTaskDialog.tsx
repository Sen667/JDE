import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { dossierAPI, adminAPI } from '@/integrations/laravel/api';
import { toast } from 'sonner';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worldId: string;
  dossierId?: string;
  workflowStepId?: string;
  onTaskCreated?: (taskData?: any) => void;
}

interface User {
  id: string;
  display_name: string | null;
  email: string;
}

const CreateTaskDialog = ({ open, onOpenChange, worldId, dossierId, workflowStepId, onTaskCreated }: CreateTaskDialogProps) => {
  console.log('CreateTaskDialog rendered with worldId:', worldId, 'open:', open);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState<Date>();
  const [assignedTo, setAssignedTo] = useState<string>('unassigned');
  const [createAppointment, setCreateAppointment] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<Date>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('useEffect triggered, open:', open);
    if (open) {
      fetchUsers();
    }
  }, [open, worldId]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users with world access');

      const result = await adminAPI.getUsersWithWorldAccess();
      setUsers(result.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Le titre est obligatoire');
      return;
    }

    setLoading(true);
    try {
      // Create task data object
      const taskData: any = {
        title,
        description,
        priority: priority.toLowerCase(),
        assigned_to: assignedTo === 'unassigned' ? null : assignedTo,
        workflow_step_id: workflowStepId || null, // Link to the current workflow step
      };

      // Add due date if provided
      if (dueDate) {
        taskData.due_date = dueDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      }

      // Add appointment creation flag
      if (createAppointment) {
        taskData.create_appointment = true;
        // Add appointment details if provided
        if (appointmentDate && startTime && endTime) {
          taskData.appointment_date = appointmentDate.toISOString().split('T')[0];
          taskData.appointment_start_time = startTime;
          taskData.appointment_end_time = endTime;
        }
      }

      console.log('Creating task with data:', taskData);

      if (dossierId) {
        // Create task via API
        const result = await dossierAPI.createDossierTask(dossierId, taskData);
        console.log('Task creation result:', result);

        toast.success(createAppointment ?
          'Tâche et rendez-vous créés avec succès' :
          'Tâche créée avec succès'
        );

        // Pass the created task data back to parent for display
        const createdTaskData = {
          id: result.task?.id || result.id,
          title,
          description,
          priority: priority.toLowerCase(),
          assigned_to: assignedTo === 'unassigned' ? null : assignedTo,
          due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
          created_at: new Date().toISOString(),
          status: 'pending'
        };

        console.log('Created task data:', createdTaskData);
        console.log('Calling onTaskCreated with taskData:', createdTaskData);
        onTaskCreated?.(createdTaskData);
      } else {
        console.warn('No dossierId provided for task creation');
        toast.error('Impossible de créer la tâche : dossier non spécifié');
        return;
      }
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Erreur lors de la création de la tâche');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate(undefined);
    setAssignedTo('unassigned');
    setCreateAppointment(false);
    setAppointmentDate(undefined);
    setStartTime('09:00');
    setEndTime('10:00');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle tâche</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Titre */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entrez le titre de la tâche"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ajoutez une description (optionnel)"
              rows={3}
            />
          </div>

          {/* Priorité */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priorité</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
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

          {/* Date limite */}
          <div className="space-y-2">
            <Label>Date limite (optionnel)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'dd MMMM yyyy', { locale: fr }) : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Assigner à */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigner à (optionnel)</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Non assignée (visible par tous)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Non assignée (visible par tous)</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.display_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Créer un RDV */}
          <div className="flex items-center space-x-2 pt-4 border-t">
            <Switch
              id="create-appointment"
              checked={createAppointment}
              onCheckedChange={setCreateAppointment}
            />
            <Label htmlFor="create-appointment">Créer un rendez-vous associé</Label>
          </div>

          {/* Section RDV */}
          {createAppointment && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label>Date du rendez-vous</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appointmentDate ? format(appointmentDate, 'dd MMMM yyyy', { locale: fr }) : 'Sélectionner une date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={appointmentDate}
                      onSelect={setAppointmentDate}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Heure de début</Label>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-time">Heure de fin</Label>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Création...' : 'Créer la tâche'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
