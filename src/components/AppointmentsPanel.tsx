import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Plus, Clock } from 'lucide-react';
import { dossierAPI } from '@/integrations/laravel/api';
import { format, isToday, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  world?: { code: string; name: string; theme_colors: any };
}

const AppointmentsPanel = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayAppointments();
  }, []);

  const fetchTodayAppointments = async () => {
    try {
      // Placeholder for Laravel appointment API integration
      // When appointment APIs are ready, this will fetch user's daily appointments
      // For now, show empty state to maintain UI functionality

      // TODO: Integrate with Laravel appointment API when ready
      // const result = await appointmentAPI.getTodayAppointments();
      // setAppointments(result.appointments || []);

      setAppointments([]);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="border-0 shadow-vuexy-md">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Rendez-vous du jour
          </CardTitle>
          <Button size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-1" />
            Nouveau RDV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun rendez-vous aujourd'hui
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center justify-center min-w-[60px] p-2 rounded-lg bg-primary/10">
                    <span className="text-xs font-medium text-primary">
                      {format(new Date(appointment.start_time), 'HH:mm')}
                    </span>
                    {appointment.end_time && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(appointment.end_time), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm">{appointment.title}</h4>
                      {appointment.world && (
                        <Badge 
                          style={{ 
                            backgroundColor: `${appointment.world.theme_colors.primary}15`,
                            color: appointment.world.theme_colors.primary,
                            borderColor: `${appointment.world.theme_colors.primary}30`
                          }}
                          className="text-xs"
                        >
                          {appointment.world.code}
                        </Badge>
                      )}
                    </div>
                    {appointment.description && (
                      <p className="text-xs text-muted-foreground">{appointment.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentsPanel;
