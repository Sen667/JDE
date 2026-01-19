import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  FileText,
  MessageSquare,
  Calendar,
  CheckSquare,
  User,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { dossierAPI } from '@/integrations/laravel/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimelineEvent {
  id: string;
  type: 'step' | 'document' | 'comment' | 'task' | 'appointment' | 'annotation';
  title: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    profile?: {
      display_name: string;
      avatar_url: string;
    };
  };
}

interface TimelineTabProps {
  dossierId: string;
}

const TimelineTab = ({ dossierId }: TimelineTabProps) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimelineEvents();
  }, [dossierId]);

  const fetchTimelineEvents = async () => {
    try {
      setLoading(true);

      // Fetch all data sources for timeline
      const [commentsResponse, docsResponse, tasksResponse, appointmentsResponse] = await Promise.all([
        fetch(`/api/dossiers/${dossierId}/comments`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/json',
          },
        }),
        fetch(`/api/dossiers/${dossierId}/attachments`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/json',
          },
        }),
        fetch(`/api/dossiers/${dossierId}/tasks`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/json',
          },
        }),
        fetch(`/api/dossiers/${dossierId}/appointments`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/json',
          },
        })
      ]);

      const timelineEvents: TimelineEvent[] = [];

      // Process comments (ignore 404s gracefully)
      if (commentsResponse.ok) {
        try {
          const commentsData = await commentsResponse.json();
          commentsData?.comments?.forEach((comment: any) => {
            timelineEvents.push({
              id: `comment-${comment.id}`,
              type: 'comment',
              title: 'Commentaire',
              content: comment.content,
              created_at: comment.created_at,
              user: comment.user,
            });
          });
        } catch (e) {
          console.warn('Failed to parse comments data:', e);
        }
      }

      // Process documents
      if (docsResponse.ok) {
        try {
          const docsData = await docsResponse.json();
          docsData?.attachments?.forEach((doc: any) => {
            timelineEvents.push({
              id: `doc-${doc.id}`,
              type: 'document',
              title: doc.file_name || 'Document',
              content: `Document (${doc.document_type || 'non spécifié'})`,
              created_at: doc.created_at,
              user: doc.uploader,
            });
          });
        } catch (e) {
          console.warn('Failed to parse documents data:', e);
        }
      }

      // Process tasks (ignore 404s gracefully)
      if (tasksResponse.ok) {
        try {
          const tasksData = await tasksResponse.json();
          tasksData?.tasks?.forEach((task: any) => {
            timelineEvents.push({
              id: `task-${task.id}`,
              type: 'task',
              title: task.title || 'Tâche',
              content: task.description || 'Tâche ajoutée',
              created_at: task.created_at,
              user: task.creator,
            });
          });
        } catch (e) {
          console.warn('Failed to parse tasks data:', e);
        }
      }

      // Process appointments (ignore 404s gracefully)
      if (appointmentsResponse.ok) {
        try {
          const appointmentsData = await appointmentsResponse.json();
          appointmentsData?.appointments?.forEach((appt: any) => {
            timelineEvents.push({
              id: `appt-${appt.id}`,
              type: 'appointment',
              title: appt.title || 'Rendez-vous',
              content: `Rendez-vous programmé`,
              created_at: appt.start_time,
              user: appt.user,
            });
          });
        } catch (e) {
          console.warn('Failed to parse appointments data:', e);
        }
      }

      // Sort by creation date (newest first)
      timelineEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setEvents(timelineEvents);
    } catch (error) {
      console.error('Error fetching timeline events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-orange-500" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-green-500" />;
      case 'appointment':
        return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'step':
        return <ArrowRight className="w-4 h-4 text-teal-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      step: 'Étape workflow',
      document: 'Document',
      comment: 'Commentaire',
      task: 'Tâche',
      appointment: 'Rendez-vous',
      annotation: 'Note',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Chargement de la timeline...</span>
      </div>
    );
  }

  return (
    <>
      {events.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          Aucun événement dans la timeline pour le moment
        </p>
      ) : (
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>

          <div className="space-y-6">
            {events.map((event) => (
              <div key={event.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-background border-2 border-border">
                  {getEventIcon(event.type)}
                </div>

                {/* Event content */}
                <div className="flex-1 min-w-0 pb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-sm">{event.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getEventTypeLabel(event.type)}
                        </Badge>
                      </div>

                      {event.content && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {event.content}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(event.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        </span>

                        {event.user && (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={event.user.profile?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                <User className="h-3 w-3" />
                              </AvatarFallback>
                            </Avatar>
                            <span>
                              {event.user.profile?.display_name || event.user.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default TimelineTab;
