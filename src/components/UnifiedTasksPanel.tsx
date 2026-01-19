import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Plus, CheckCircle2, Clock, AlertCircle, Eye, MoreVertical, UserCog, Check, Mail, Paperclip, Calendar, Trash2 } from 'lucide-react';
import { taskAPI, appointmentAPI } from '@/integrations/laravel/api';
import { useAuthStore, World } from '@/lib/store';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TaskDetailDialog } from './TaskDetailDialog';
import CreateTaskDialog from './CreateTaskDialog';
import { toast } from 'sonner';
import { DEMO_EMAILS } from '@/data/emails';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import JDELogo from '@/assets/JDE.png';
import JDMOLogo from '@/assets/JDMO.png';
import DBCSLogo from '@/assets/DBCS.png';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  world_id: string;
  created_at: string;
}

interface Appointment {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  world_id: string;
}

interface UnifiedTasksPanelProps {
  accessibleWorlds: World[];
}

const UnifiedTasksPanel = ({ accessibleWorlds }: UnifiedTasksPanelProps) => {
  const { isSuperAdmin, user, roles } = useAuthStore();
  const navigate = useNavigate();
  
  // Mapping des couleurs par code de monde (correction des couleurs inversées)
  const colorMap: Record<string, { primary: string; accent: string }> = {
    JDE: { 
      primary: 'hsl(0, 85%, 58%)',     // Rouge
      accent: 'hsl(0, 70%, 45%)'
    },
    JDMO: { 
      primary: 'hsl(25, 95%, 60%)',    // Orange
      accent: 'hsl(25, 80%, 50%)'
    },
    DBCS: { 
      primary: 'hsl(145, 65%, 48%)',   // Vert
      accent: 'hsl(145, 50%, 40%)'
    },
  };
  
  const getWorldColors = (worldCode: string) => {
    return colorMap[worldCode] || { primary: 'hsl(0, 0%, 50%)', accent: 'hsl(0, 0%, 40%)' };
  };
  const [tasksByWorld, setTasksByWorld] = useState<Record<string, Task[]>>({});
  const [appointmentsByWorld, setAppointmentsByWorld] = useState<Record<string, Appointment[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [selectedWorldForTask, setSelectedWorldForTask] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchAllTasks();
    fetchAllAppointments();
  }, [accessibleWorlds, priorityFilter]);

  const fetchAllTasks = async () => {
    try {
      setLoading(true);

      // Get user's tasks using the user-specific endpoint
      let myTasks: Task[] = [];

      try {
        const myTasksResponse = await taskAPI.getMyTasks();
        if (myTasksResponse && myTasksResponse.tasks) {
          myTasks = myTasksResponse.tasks;
        }
      } catch (error) {
        console.warn('Could not fetch user tasks:', error);
        myTasks = [];
      }

      // Filter out completed tasks (keep todo, in_progress)
      let filteredTasks = myTasks.filter(task => task.status !== 'done');

      if (priorityFilter) {
        filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
      }

      // Grouper et trier les tâches par monde
      const grouped: Record<string, Task[]> = {};
      accessibleWorlds.forEach(world => {
        grouped[world.id] = [];
      });

      filteredTasks.forEach(task => {
        if (grouped[task.world_id]) {
          grouped[task.world_id].push(task);
        }
      });

      // Trier les tâches par date d'échéance dans chaque monde
      Object.keys(grouped).forEach(worldId => {
        grouped[worldId].sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
      });

      setTasksByWorld(grouped);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Erreur lors du chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAppointments = async () => {
    try {
      // Get user's appointments using the user-specific endpoint
      let myAppointments: Appointment[] = [];

      try {
        const myAppointmentsResponse = await appointmentAPI.getMyAppointments();
        if (myAppointmentsResponse && myAppointmentsResponse.appointments) {
          // Filter to future appointments only
          myAppointments = myAppointmentsResponse.appointments.filter(
            appt => new Date(appt.start_time) > new Date()
          );
        }
      } catch (error) {
        console.warn('Could not fetch user appointments:', error);
        myAppointments = [];
      }

      // Group appointments by world and limit to 3 per world
      const grouped: Record<string, Appointment[]> = {};
      accessibleWorlds.forEach(world => {
        grouped[world.id] = myAppointments
          .filter(appt => appt.world_id === world.id)
          .slice(0, 3); // Limit to 3 per world
      });

      setAppointmentsByWorld(grouped);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      // Don't show toast for appointments since they might not be implemented yet
      // Clear appointments on error
      const grouped: Record<string, Appointment[]> = {};
      accessibleWorlds.forEach(world => {
        grouped[world.id] = [];
      });
      setAppointmentsByWorld(grouped);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await taskAPI.updateTaskStatus(taskId, newStatus);
      toast.success(newStatus === 'done' ? 'Tâche validée' : 'Tâche réactivée');
      fetchAllTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Erreur lors de la mise à jour de la tâche');
    }
  };

  const handleQuickValidate = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateTaskStatus(taskId, 'done');
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await taskAPI.deleteTask(taskId);
      toast.success('Tâche supprimée avec succès');
      await fetchAllTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Erreur lors de la suppression de la tâche');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-pink-50 text-pink-700 border-pink-300';
      case 'high':
        return 'bg-purple-50 text-purple-700 border-purple-300';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border-blue-300';
      case 'low':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'hsl(330, 85%, 55%)'; // Rose/Magenta
      case 'high':
        return 'hsl(270, 70%, 60%)'; // Violet
      case 'medium':
        return 'hsl(210, 75%, 55%)'; // Bleu
      case 'low':
        return 'hsl(0, 0%, 60%)'; // Gris
      default:
        return 'hsl(0, 0%, 60%)';
    }
  };

  const getPriorityBackgroundColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'hsl(330, 85%, 97%)'; // Rose très clair
      case 'high':
        return 'hsl(270, 70%, 97%)'; // Violet très clair
      case 'medium':
        return 'hsl(210, 75%, 97%)'; // Bleu très clair
      case 'low':
        return 'hsl(0, 0%, 96%)'; // Gris très clair
      default:
        return 'hsl(0, 0%, 96%)';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-3 w-3" />;
      case 'high':
        return <AlertCircle className="h-3 w-3" />;
      case 'medium':
        return <Clock className="h-3 w-3" />;
      case 'low':
        return <CheckCircle2 className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Élevée';
      case 'medium':
        return 'Moyenne';
      case 'low':
        return 'Basse';
      default:
        return priority;
    }
  };

  const worldIcons: Record<string, string> = {
    'JDE': JDELogo,
    'JDMO': JDMOLogo,
    'DBCS': DBCSLogo,
  };

  const getWorldIcon = (worldCode: string) => {
    return worldIcons[worldCode] || null;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accessibleWorlds.map(world => (
          <Card key={world.id} className="animate-pulse">
            <CardHeader className="h-20 bg-muted/50" />
            <CardContent className="h-64 bg-muted/20" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accessibleWorlds.map(world => {
          const worldTasks = tasksByWorld[world.id] || [];
          const incompleteTasks = worldTasks.filter(t => t.status !== 'done');
          const worldAppointments = appointmentsByWorld[world.id] || [];
          const worldColors = getWorldColors(world.code);

          return (
            <Card 
              key={world.id} 
              className="flex flex-col transition-all"
              style={{
                borderColor: worldColors.primary,
                borderWidth: '2px',
              }}
            >
              <CardHeader 
                className="pb-4 space-y-4"
                style={{
                  background: `linear-gradient(135deg, ${worldColors.primary}08 0%, ${worldColors.accent}05 100%)`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center" 
                      style={{ backgroundColor: `${worldColors.primary}20` }}
                    >
                      {getWorldIcon(world.code) && (
                        <img 
                          src={getWorldIcon(world.code)!} 
                          alt={world.code}
                          className="w-7 h-7 object-contain"
                        />
                      )}
                    </div>
                    <div>
                      <h3 
                        className="font-semibold"
                        style={{ color: worldColors.primary }}
                      >
                        {world.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {incompleteTasks.length} tâche{incompleteTasks.length !== 1 ? 's' : ''} active{incompleteTasks.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {isSuperAdmin() && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        console.log('Nouvelle tâche clicked for world:', world.id);
                        setSelectedWorldForTask(world.id);
                        setCreateTaskDialogOpen(true);
                        console.log('Dialog state set to true');
                      }}
                      style={{
                        borderColor: worldColors.primary,
                        color: 'white',
                        backgroundColor: worldColors.primary,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.filter = 'brightness(0.85)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = 'brightness(1)';
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nouvelle
                    </Button>
                  )}
                </div>
                
                {/* Priority Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground mr-1">Filtrer:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs transition-all"
                    style={priorityFilter === 'urgent' ? {
                      backgroundColor: worldColors.primary,
                      color: 'white',
                      borderColor: worldColors.primary,
                    } : {
                      borderColor: worldColors.primary,
                      color: 'white',
                      backgroundColor: worldColors.primary,
                    }}
                    onClick={() => setPriorityFilter(priorityFilter === 'urgent' ? null : 'urgent')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = 'brightness(0.85)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'brightness(1)';
                    }}
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Urgent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs transition-all"
                    style={priorityFilter === 'high' ? {
                      backgroundColor: worldColors.primary,
                      color: 'white',
                      borderColor: worldColors.primary,
                    } : {
                      borderColor: worldColors.primary,
                      color: 'white',
                      backgroundColor: worldColors.primary,
                    }}
                    onClick={() => setPriorityFilter(priorityFilter === 'high' ? null : 'high')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = 'brightness(0.85)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'brightness(1)';
                    }}
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Élevé
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs transition-all"
                    style={priorityFilter === 'medium' ? {
                      backgroundColor: worldColors.primary,
                      color: 'white',
                      borderColor: worldColors.primary,
                    } : {
                      borderColor: worldColors.primary,
                      color: 'white',
                      backgroundColor: worldColors.primary,
                    }}
                    onClick={() => setPriorityFilter(priorityFilter === 'medium' ? null : 'medium')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = 'brightness(0.85)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'brightness(1)';
                    }}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Moyen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs transition-all"
                    style={priorityFilter === 'low' ? {
                      backgroundColor: worldColors.primary,
                      color: 'white',
                      borderColor: worldColors.primary,
                    } : {
                      borderColor: worldColors.primary,
                      color: 'white',
                      backgroundColor: worldColors.primary,
                    }}
                    onClick={() => setPriorityFilter(priorityFilter === 'low' ? null : 'low')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = 'brightness(0.85)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'brightness(1)';
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Bas
                  </Button>
                  {priorityFilter && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs transition-all"
                      style={{ 
                        color: 'white',
                        borderColor: worldColors.primary,
                        backgroundColor: worldColors.primary,
                      }}
                      onClick={() => setPriorityFilter(null)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.filter = 'brightness(0.85)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = 'brightness(1)';
                      }}
                    >
                      Réinitialiser
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-6 p-6">
                {/* Tasks Section */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b-2" style={{ borderColor: worldColors.primary }}>
                    <CheckCircle2 className="h-5 w-5" style={{ color: worldColors.primary }} />
                    <h4 className="text-sm font-bold uppercase tracking-wide" style={{ color: worldColors.primary }}>
                      Tâches
                    </h4>
                  </div>
                  {worldTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">Aucune tâche assignée</p>
                    </div>
                  ) : (
                    worldTasks.map(task => (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border-2 transition-all hover:shadow-md",
                            task.status === 'done' && 'bg-muted/30 border-border/50 opacity-60'
                          )}
                          style={task.status !== 'done' ? {
                            borderColor: getPriorityBorderColor(task.priority),
                            backgroundColor: getPriorityBackgroundColor(task.priority),
                          } : undefined}
                        >
                        <Checkbox
                          checked={task.status === 'done'}
                          onCheckedChange={(checked) => 
                            updateTaskStatus(task.id, checked ? 'done' : 'todo')
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start gap-2 flex-wrap">
                            <h4 className={cn(
                              "text-sm font-medium flex-1 min-w-0",
                              task.status === 'done' && 'line-through text-muted-foreground'
                            )}>
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-1.5">
                              {!task.assigned_to && (
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                  Non assignée
                                </Badge>
                              )}
                              <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
                                {getPriorityIcon(task.priority)}
                                <span className="ml-1">{getPriorityLabel(task.priority)}</span>
                              </Badge>
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          {task.due_date && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedTask(task);
                              setDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {task.status !== 'done' && (
                                <DropdownMenuItem onClick={(e) => handleQuickValidate(task.id, e)}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Valider tâche
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={(e) => handleDeleteTask(task.id, e)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer tâche
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Emails Section */}
                <div className="space-y-3 pt-6 border-t-2" style={{ borderColor: `${worldColors.primary}40` }}>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b-2" style={{ borderColor: worldColors.primary }}>
                    <Mail className="h-5 w-5" style={{ color: worldColors.primary }} />
                    <h4 className="text-sm font-bold uppercase tracking-wide" style={{ color: worldColors.primary }}>
                      Emails
                    </h4>
                  </div>
                  {(() => {
                    const worldEmails = DEMO_EMAILS.filter(email => email.labels.includes(world.code));
                    const unreadEmails = worldEmails.filter(e => e.unread);
                    const recentUnreadEmails = unreadEmails.slice(0, 3);

                    if (unreadEmails.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <Mail className="h-10 w-10 text-muted-foreground/30 mb-2" />
                          <p className="text-xs text-muted-foreground">Aucun email non lu</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-muted-foreground">
                            {unreadEmails.length} email{unreadEmails.length !== 1 ? 's' : ''} non lu{unreadEmails.length !== 1 ? 's' : ''}
                          </p>
                        </div>

                        <div className="space-y-2">
                          {recentUnreadEmails.map(email => (
                            <div
                              key={email.id}
                              className="flex items-start gap-3 p-2 rounded-lg border transition-colors cursor-pointer"
                              style={{
                                borderColor: `${worldColors.primary}30`,
                                backgroundColor: `${worldColors.primary}08`,
                              }}
                              onClick={() => navigate('/mailbox')}
                            >
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback 
                                  className="text-xs font-semibold"
                                  style={{
                                    backgroundColor: `${worldColors.primary}20`,
                                    color: worldColors.primary,
                                  }}
                                >
                                  {email.senderAvatar}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {email.sender}
                                  </p>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {email.priority === 'high' && (
                                      <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                                        Urgent
                                      </Badge>
                                    )}
                                    {email.hasAttachment && (
                                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-foreground truncate mb-0.5">
                                  {email.subject}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {email.time}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => navigate('/mailbox')}
                        >
                          → Voir tous les emails
                        </Button>
                      </>
                    );
                  })()}
                </div>

                {/* Appointments Section */}
                <div className="space-y-3 pt-6 border-t-2" style={{ borderColor: `${worldColors.primary}40` }}>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b-2" style={{ borderColor: worldColors.primary }}>
                    <Calendar className="h-5 w-5" style={{ color: worldColors.primary }} />
                    <h4 className="text-sm font-bold uppercase tracking-wide" style={{ color: worldColors.primary }}>
                      Agenda
                    </h4>
                  </div>

                  {worldAppointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <Calendar className="h-10 w-10 text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground">Aucun rendez-vous planifié</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {worldAppointments.map(appointment => (
                          <div
                            key={appointment.id}
                            className="flex items-start gap-3 p-2 rounded-lg border transition-colors"
                            style={{
                              borderColor: `${worldColors.primary}30`,
                              backgroundColor: `${worldColors.primary}05`,
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate mb-1">
                                {appointment.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(appointment.start_time), 'dd MMM yyyy', { locale: fr })} à{' '}
                                {format(new Date(appointment.start_time), 'HH:mm', { locale: fr })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                      >
                        → Voir tous les rendez-vous
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedTask(null);
            }
          }}
          onTaskUpdated={fetchAllTasks}
        />
      )}

      {createTaskDialogOpen && selectedWorldForTask && (
        <CreateTaskDialog
          open={createTaskDialogOpen}
          onOpenChange={(open) => {
            console.log('Dialog onOpenChange called with:', open);
            setCreateTaskDialogOpen(open);
            if (!open) {
              setSelectedWorldForTask('');
            }
          }}
          worldId={selectedWorldForTask}
          onTaskCreated={() => {
            fetchAllTasks();
            setCreateTaskDialogOpen(false);
            setSelectedWorldForTask('');
          }}
        />
      )}
    </>
  );
};

export default UnifiedTasksPanel;
