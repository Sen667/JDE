import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/integrations/laravel/client';
import { notificationAPI } from '@/integrations/laravel/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const NotificationBell = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousUnreadCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Set up polling for notifications (Laravel Broadcasting to be implemented later)
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const result = await notificationAPI.getNotifications({ per_page: 10 });

      if (result.notifications) {
        const notifications = result.notifications;
        setNotifications(notifications);
        const newUnreadCount = notifications.filter(n => !n.read).length;

        // Détecter une nouvelle notification
        if (newUnreadCount > previousUnreadCountRef.current) {
          // Jouer le son
          playNotificationSound();

          // Déclencher l'animation
          setIsAnimating(true);
          setTimeout(() => setIsAnimating(false), 500);
        }

        previousUnreadCountRef.current = newUnreadCount;
        setUnreadCount(newUnreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const playNotificationSound = () => {
    // Créer un son de notification simple avec Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Créer une série de bips pour une notification agréable
    const playBeep = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const currentTime = audioContext.currentTime;
    playBeep(800, currentTime, 0.1);
    playBeep(1000, currentTime + 0.1, 0.15);
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell 
            className={`h-5 w-5 transition-transform ${
              isAnimating ? 'animate-notification-shake' : ''
            }`} 
          />
          {unreadCount > 0 && (
            <Badge 
              className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs ${
                isAnimating ? 'animate-notification-bounce' : ''
              }`}
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs h-auto py-1"
              >
                Tout marquer comme lu
              </Button>
            )}
          </div>
          <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune notification
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors ${
                      !notif.read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notif.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notif.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
