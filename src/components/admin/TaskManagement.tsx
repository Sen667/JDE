import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckSquare, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/laravel/client';
import { taskAPI } from '@/integrations/laravel/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/lib/store';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string;
  assigned_user: { display_name: string | null; email: string };
  world: { code: string; name: string; theme_colors: any };
}

interface User {
  id: string;
  email: string;
  display_name: string | null;
}

const TaskManagement = () => {
  const { accessibleWorlds } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    assigned_to: '',
    world_id: '',
    due_date: ''
  });

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [selectedUserId]);

  const fetchTasks = async () => {
    setLoading(true);

    try {
      // For now, create mock data since tasks API isn't implemented yet
      // TODO: Replace with actual Laravel API call when tasks controller is ready

      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Première tâche exemple',
          description: 'Description de la tâche exemple',
          status: 'todo',
          priority: 'medium',
          due_date: null,
          assigned_to: '2',
          assigned_user: { display_name: 'Test User', email: 'test@example.com' },
          world: { code: 'JDE', name: 'JDE', theme_colors: { primary: '#007bff', accent: '#6c757d', neutral: '#f8f9fa' } }
        }
      ];

      setTasks(mockTasks.filter(task => selectedUserId === 'all' || task.assigned_to === selectedUserId));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    }

    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      // For now, create mock users since tasks API isn't implemented yet
      const mockUsers: User[] = [
        { id: '2', email: 'test@example.com', display_name: 'Test User' }
      ];

      setUsers(mockUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      assigned_to: '',
      world_id: '',
      due_date: ''
    });
    setEditingTask(null);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.assigned_to || !formData.world_id) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive'
      });
      return;
    }

    // TODO: Implement when Laravel tasks controller is ready
    toast({
      title: 'Système temporaire',
      description: 'La fonctionnalité des tâches sera disponible une fois l\'API Laravel implémentée'
    });

    fetchTasks();
    setDialogOpen(false);
    resetForm();
  };

  const deleteTask = async (taskId: string) => {
    // TODO: Implement when Laravel tasks controller is ready
    toast({
      title: 'Système temporaire',
      description: 'La suppression des tâches sera disponible une fois l\'API Laravel implémentée'
    });

    fetchTasks();
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      assigned_to: task.assigned_to,
      world_id: task.world.code,
      due_date: task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : ''
    });
    setDialogOpen(true);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'todo':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cancelled':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <Card className="border-0 shadow-vuexy-md">
      <CardHeader className="border-b">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Gestion des Tâches
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Créez et gérez les tâches assignées aux utilisateurs
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tous les utilisateurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les utilisateurs</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.display_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nouvelle tâche
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingTask ? 'Modifier la tâche' : 'Créer une nouvelle tâche'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="title">Titre *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Titre de la tâche"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description détaillée"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priorité</Label>
                      <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Basse</SelectItem>
                          <SelectItem value="medium">Moyenne</SelectItem>
                          <SelectItem value="high">Haute</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status">Statut</Label>
                      <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">À faire</SelectItem>
                          <SelectItem value="in_progress">En cours</SelectItem>
                          <SelectItem value="done">Terminé</SelectItem>
                          <SelectItem value="cancelled">Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="assigned_to">Assigné à *</Label>
                      <Select value={formData.assigned_to} onValueChange={(val) => setFormData({ ...formData, assigned_to: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un utilisateur" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.display_name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="world_id">Monde *</Label>
                      <Select value={formData.world_id} onValueChange={(val) => setFormData({ ...formData, world_id: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un monde" />
                        </SelectTrigger>
                        <SelectContent>
                          {accessibleWorlds.map((world) => (
                            <SelectItem key={world.id} value={world.id}>
                              {world.name} ({world.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="due_date">Date d'échéance</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSubmit} className="w-full">
                    {editingTask ? 'Modifier' : 'Créer'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="font-semibold">Titre</TableHead>
              <TableHead className="font-semibold">Assigné à</TableHead>
              <TableHead className="font-semibold">Monde</TableHead>
              <TableHead className="font-semibold">Priorité</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="font-semibold">Échéance</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-6 w-16 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-6 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-6 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-8 w-20 bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : tasks.map((task) => (
              <TableRow key={task.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>{task.assigned_user.display_name || task.assigned_user.email}</TableCell>
                <TableCell>
                  <Badge
                    style={{
                      backgroundColor: `${task.world.theme_colors.primary}15`,
                      color: task.world.theme_colors.primary,
                      borderColor: `${task.world.theme_colors.primary}30`
                    }}
                  >
                    {task.world.code}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {task.due_date ? format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr }) : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => editTask(task)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Aucune tâche trouvée
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TaskManagement;
