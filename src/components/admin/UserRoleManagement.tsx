import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search
} from 'lucide-react';
import { adminAPI } from '@/integrations/laravel/api';
import { useToast } from '@/hooks/use-toast';
import UserRoleManagement from '@/components/admin/UserRoleManagement';

interface User {
  id: string;
  name: string;
  email: string;
  profile?: {
    display_name: string;
  };
  roles: string[];
  worldAccess?: {
    code: string;
    name: string;
  }[];
}

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role?: string;
}

const UserManagementComponent = () => {
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const { toast } = useToast();

  // Create form state
  const [createForm, setCreateForm] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'user'
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    display_name: '',
    role: '',
    selectedWorlds: [] as string[]
  });

  const availableRoles = [
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' },
    { value: 'super-admin', label: 'Super Admin' }
  ];

  const availableWorlds = [
    { id: 'JDE', name: 'Justice de l\'Enfance', code: 'JDE' },
    { id: 'JDMO', name: 'Justice des Mineurs et de la Famille', code: 'JDMO' },
    { id: 'DBCS', name: 'Directions des Bâtiments et Constructions Scolaires', code: 'DBCS' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const apiResponse = await adminAPI.getUsers();
      console.log('API Response:', apiResponse);
      if (apiResponse && apiResponse.users) {
        console.log('Users found:', apiResponse.users.length);
        setUsers(apiResponse.users);
      } else {
        console.log('No users array found in response');
        toast({
          title: 'Avertissement',
          description: 'Aucun utilisateur trouvé dans la réponse API',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('API Error:', error);
      if (error?.response?.status) {
        console.error('Error status:', error.response.status);
      }
      if (error?.response?.data) {
        console.error('Error data:', error.response.data);
      }
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Erreur inconnue';
      toast({
        title: 'Erreur API',
        description: `Impossible de charger les utilisateurs: ${errorMessage}`,
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createForm.password !== createForm.password_confirmation) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive'
      });
      return;
    }

    try {
      await adminAPI.createUser(createForm);
      toast({
        title: 'Succès',
        description: 'Utilisateur créé avec succès'
      });
      setCreateDialogOpen(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'user'
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer l\'utilisateur',
        variant: 'destructive'
      });
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) return;

    try {
      // Update user info
      await adminAPI.updateUser(selectedUser.id, {
        name: editForm.name,
        email: editForm.email
      });

      // Update role
      if (editForm.role) {
        await adminAPI.updateUserRole(selectedUser.id, editForm.role);
      }

      // Update world access
      if (editForm.selectedWorlds.length > 0) {
        await adminAPI.updateUserWorldAccess(selectedUser.id, editForm.selectedWorlds);
      }

      toast({
        title: 'Succès',
        description: 'Utilisateur modifié avec succès'
      });
      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier l\'utilisateur',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await adminAPI.deleteUser(userToDelete.id);
      toast({
        title: 'Succès',
        description: 'Utilisateur supprimé avec succès'
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'utilisateur',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      display_name: user.profile?.display_name || '',
      role: user.roles[0] || '',
      selectedWorlds: user.worldAccess?.map(w => w.code) || []
    });
    setEditDialogOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'user':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8 max-w-7xl">Chargement...</div>;
  }

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Gestion des Utilisateurs</h1>
        <p className="text-muted-foreground">
          Gérez les utilisateurs, leurs rôles et leurs accès aux mondes
        </p>
      </div>

      <Card className="border-0 shadow-vuexy-md">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Utilisateurs
          </CardTitle>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Créer Utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Créer un Nouvel Utilisateur</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <Label htmlFor="create-name">Nom</Label>
                  <Input
                    id="create-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-email">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Mot de passe</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords ? 'text' : 'password'}
                      value={createForm.password}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-auto w-auto p-1"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Confirmer Mot de passe</Label>
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={createForm.password_confirmation}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password_confirmation: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Rôle</Label>
                  <Select value={createForm.role} onValueChange={(value) => setCreateForm(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">Créer</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Nom</TableHead>
                <TableHead className="font-semibold">Rôles</TableHead>
                <TableHead className="font-semibold">Mond</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30">
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.profile?.display_name || user.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {user.roles.length === 0 ? (
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                          Aucun rôle
                        </Badge>
                      ) : (
                        user.roles.map((role, i) => (
                          <Badge key={i} className={getRoleBadgeColor(role)}>
                            {role}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.worldAccess?.map((world, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {world.code}
                        </Badge>
                      )) || <span className="text-muted-foreground">Aucun</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setUserToDelete(user);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Nom</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-display-name">Nom d'affichage</Label>
              <Input
                id="edit-display-name"
                value={editForm.display_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
              />
            </div>

            <div>
              <Label>Rôle</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Accès aux mondes</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {availableWorlds.map(world => (
                  <div key={world.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`world-${world.code}`}
                      checked={editForm.selectedWorlds.includes(world.code)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditForm(prev => ({
                          ...prev,
                          selectedWorlds: checked
                            ? [...prev.selectedWorlds, world.code]
                            : prev.selectedWorlds.filter(w => w !== world.code)
                        }));
                      }}
                      className="rounded"
                    />
                    <Label htmlFor={`world-${world.code}`} className="text-sm">
                      {world.name} ({world.code})
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'utilisateur "{userToDelete?.email}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagementComponent;
