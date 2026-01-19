import { useEffect, useState } from 'react';
import { dossierAPI } from '@/integrations/laravel/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, XCircle, Clock, Edit, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import EditAppointmentDialog from './EditAppointmentDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppointmentsTabProps {
  dossierId: string;
  worldId: string;
}

interface Appointment {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string | null;
  status: string;
  appointment_type: string;
}

const AppointmentsTab = ({ dossierId, worldId }: AppointmentsTabProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [dossierId]);

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/appointments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      } else {
        console.error('Failed to fetch appointments');
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      reconnaissance: 'Reconnaissance',
      pointage_chiffrage: 'Pointage chiffrage',
      rcci: 'RCCI',
      cloture: 'Clôture',
    };
    return labels[type] || type;
  };

  const getStatusInfo = (status: string, startTime: string) => {
    const isPast = new Date(startTime) < new Date();
    
    if (status === 'completed') {
      return { 
        label: 'Terminé', 
        icon: CheckCircle2, 
        className: 'bg-emerald-100 text-emerald-700 border-emerald-300' 
      };
    }
    if (status === 'cancelled') {
      return { 
        label: 'Annulé', 
        icon: XCircle, 
        className: 'bg-gray-100 text-gray-500 border-gray-300' 
      };
    }
    if (isPast && status === 'scheduled') {
      return { 
        label: 'Passé', 
        icon: Clock, 
        className: 'bg-amber-100 text-amber-700 border-amber-300' 
      };
    }
    return { 
      label: 'Planifié', 
      icon: Calendar, 
      className: 'bg-blue-100 text-blue-700 border-blue-300' 
    };
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setEditDialogOpen(true);
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        toast.success(`Rendez-vous ${newStatus === 'completed' ? 'marqué comme terminé' : 'annulé'}`);
        fetchAppointments(); // Refresh the list
      } else {
        console.error('Failed to update appointment status');
        toast.error('Erreur lors de la mise à jour du statut');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Erreur de réseau lors de la mise à jour');
    }
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
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Rendez-vous liés au dossier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun rendez-vous planifié</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appointment) => {
                  const statusInfo = getStatusInfo(appointment.status, appointment.start_time);
                  const StatusIcon = statusInfo.icon;
                  const isCompleted = appointment.status === 'completed' || appointment.status === 'cancelled';

                  return (
                    <div
                      key={appointment.id}
                      className={`p-4 border rounded-lg transition-all ${
                        isCompleted ? 'opacity-60' : 'hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-base">{appointment.title}</h4>
                          {appointment.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {appointment.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${statusInfo.className} flex items-center gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                          {appointment.appointment_type && (
                            <Badge variant="outline">
                              {getAppointmentTypeLabel(appointment.appointment_type)}
                            </Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAppointment(appointment)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              {appointment.status !== 'completed' && (
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateStatus(appointment.id, 'completed')}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Marquer comme terminé
                                </DropdownMenuItem>
                              )}
                              {appointment.status !== 'cancelled' && (
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateStatus(appointment.id, 'cancelled')}
                                  className="text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Annuler
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(appointment.start_time), 'dd MMMM yyyy', { locale: fr })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(appointment.start_time), 'HH:mm', { locale: fr })}
                          {appointment.end_time && ` - ${format(new Date(appointment.end_time), 'HH:mm', { locale: fr })}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EditAppointmentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        appointment={editingAppointment}
        onAppointmentUpdated={fetchAppointments}
      />
    </>
  );
};

export default AppointmentsTab;
