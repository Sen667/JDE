import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin, Plus, CheckCircle, Trash2 } from "lucide-react";
import { AddAppointmentDialog } from "./AddAppointmentDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Appointment {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  location?: string;
}

interface AppointmentPlanningStepProps {
  dossierId: string;
  workflowStepId: string;
  onComplete: (formData?: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  showExistingAppointments?: boolean; // Control whether to show existing appointments
}

export function AppointmentPlanningStep({
  dossierId,
  workflowStepId,
  onComplete,
  isSubmitting = false,
  showExistingAppointments = true
}: AppointmentPlanningStepProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [initialAppointmentCount, setInitialAppointmentCount] = useState(0);
  const [hasCreatedNewAppointment, setHasCreatedNewAppointment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [dossierId, workflowStepId]);

  const fetchAppointments = async () => {
    try {
      // Fetch all appointments for the dossier to show existing ones
      const allResponse = await fetch(`/api/dossiers/${dossierId}/appointments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': 'application/json',
        },
      });

      if (allResponse.ok) {
        const allData = await allResponse.json();
        setAppointments(allData.appointments || []);
        setInitialAppointmentCount(allData.appointments?.length || 0);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentCreated = () => {
    setHasCreatedNewAppointment(true); // Mark that a new appointment was created
    fetchAppointments(); // Refresh the list
  };

  const handleCompleteStep = () => {
    // Complete the step with appointment data
    const formData = {
      appointments_created: appointments.length,
      appointment_ids: appointments.map(a => a.id)
    };
    onComplete(formData);
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'à' HH:mm", { locale: fr });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Planification des rendez-vous</h3>
          <p className="text-muted-foreground">
            Créez les rendez-vous nécessaires pour la reconnaissance terrain
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un rendez-vous
        </Button>
      </div>

      {/* Appointments List */}
      {appointments.length > 0 ? (
        <div className="space-y-4">
          <h4 className="font-medium">Rendez-vous planifiés ({appointments.length})</h4>
          <div className="grid gap-4">
            {appointments.map((appointment) => (
              <Card key={appointment.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <h5 className="font-medium">{appointment.title}</h5>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDateTime(appointment.start_time)}
                      </div>

                      {appointment.end_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDateTime(appointment.end_time)}
                        </div>
                      )}

                      {appointment.user && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {appointment.user.name}
                        </div>
                      )}

                      {appointment.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {appointment.location}
                        </div>
                      )}
                    </div>

                    {appointment.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {appointment.description}
                      </p>
                    )}
                  </div>

                  <Badge variant="secondary" className="ml-2">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Planifié
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="space-y-2">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
            <h4 className="font-medium">Aucun rendez-vous planifié</h4>
            <p className="text-sm text-muted-foreground">
              Cliquez sur "Ajouter un rendez-vous" pour commencer la planification
            </p>
          </div>
        </Card>
      )}

      {/* Complete Step Button - Only show if new appointments were created in this step */}
      {hasCreatedNewAppointment && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleCompleteStep}
            disabled={isSubmitting}
            size="lg"
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Finalisation...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Terminer la planification ({appointments.length} rendez-vous)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Add Appointment Dialog */}
      <AddAppointmentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        dossierId={dossierId}
        workflowStepId={workflowStepId}
        onAppointmentCreated={handleAppointmentCreated}
      />
    </div>
  );
}
