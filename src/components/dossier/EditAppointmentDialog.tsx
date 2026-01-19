import { useState, useEffect } from 'react';
import { dossierAPI } from '@/integrations/laravel/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: string;
  appointment_type: string;
}

interface EditAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  onAppointmentUpdated: () => void;
}

const EditAppointmentDialog = ({
  open,
  onOpenChange,
  appointment,
  onAppointmentUpdated,
}: EditAppointmentDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (appointment) {
      setTitle(appointment.title);
      setDescription(appointment.description || '');

      // Format dates for datetime-local input (YYYY-MM-DDTHH:MM)
      if (appointment.start_time) {
        const startDate = new Date(appointment.start_time);
        const formattedStart = startDate.toISOString().slice(0, 16); // Remove seconds
        setStartTime(formattedStart);
      } else {
        setStartTime('');
      }

      if (appointment.end_time) {
        const endDate = new Date(appointment.end_time);
        const formattedEnd = endDate.toISOString().slice(0, 16); // Remove seconds
        setEndTime(formattedEnd);
      } else {
        setEndTime('');
      }
    }
  }, [appointment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !startTime) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (endTime && new Date(endTime) <= new Date(startTime)) {
      toast.error('L\'heure de fin doit être après l\'heure de début');
      return;
    }

    if (!appointment) return;

    setLoading(true);

    try {
      // Call the appointment update API
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          start_time: startTime,
          end_time: endTime || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.message) {
        toast.success(data.message);
      } else {
        toast.success('Rendez-vous modifié avec succès');
      }

      onAppointmentUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast.error('Erreur lors de la modification du rendez-vous');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier le rendez-vous</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre du rendez-vous"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du rendez-vous"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Date et heure de début *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Date et heure de fin</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Modification...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAppointmentDialog;
