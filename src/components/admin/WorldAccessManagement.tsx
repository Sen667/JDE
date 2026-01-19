import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Globe, Plus, Trash2, Loader2 } from 'lucide-react';
import { worldAPI, adminAPI } from '@/integrations/laravel/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore, World } from '@/lib/store';

interface UserAccess {
  id: string;
  email: string;
  display_name: string | null;
  worlds: World[];
}

const WorldAccessManagement = () => {
  const [allWorlds, setAllWorlds] = useState<World[]>([]);
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserAccess | null>(null);
  const [selectedWorld, setSelectedWorld] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllWorlds();
    fetchUsersWithAccess();
  }, []);

  const fetchAllWorlds = async () => {
    try {
      console.log('Fetching all worlds...');
      const response = await worldAPI.getWorlds();
      console.log('World API raw response:', response);

      // API function returns response.data directly, which has {worlds: [...]}
      const worldsData = response.worlds || [];
      console.log('Parsed worlds data:', worldsData);
      console.log('Worlds count:', worldsData.length);

      setAllWorlds(worldsData);
      console.log('All worlds set:', worldsData.length, 'worlds');
    } catch (error) {
      console.error('World API error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les mondes',
        variant: 'destructive'
      });
    }
  };

  const fetchUsersWithAccess = async () => {
    setLoading(true);
    try {
      console.log('Fetching users with world access...');
      const response = await adminAPI.getUsersWithWorldAccess();
      console.log('Users API raw response:', response);
      console.log('Response.users:', response.users);

      // API function returns response.data directly, which has {users: [...], pagination: {...}}
      const usersData = response.users || [];
      console.log('Users data:', usersData);
      console.log('Users count:', usersData.length);

      if (usersData && usersData.length > 0) {
        const processedUsers = usersData.map((u: any) => {
          console.log('Processing user:', {
            id: u.id,
            email: u.email,
            display_name: u.display_name || u.profile?.display_name
          });
          console.log('User worldAccess raw:', u.worldAccess);
          console.log('User worldAccess type:', typeof u.worldAccess);
          console.log('User worldAccess isArray?', Array.isArray(u.worldAccess));

          const filteredWorlds = (u.worlds || []).filter((world: any) => {
            console.log('Processing world entry:', world);
            console.log('World has id?', !!(world && world.id));
            return world && world.id;
          });

          console.log('Filtered worlds result:', filteredWorlds);
          console.log('Final worlds count for user:', filteredWorlds.length);

          return {
            ...u,
            worlds: filteredWorlds
          };
        });
        console.log('Processed users:', processedUsers);

        setUsers(processedUsers);
        console.log('Users set in state');
      } else {
        console.log('No users data found');
        setUsers([]);
      }
    } catch (error) {
      console.error('Users API error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les utilisateurs',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  const addWorldAccess = async () => {
    if (!selectedUser || !selectedWorld) return;

    try {
      await adminAPI.addUserWorldAccess(selectedUser.id, selectedWorld);
      toast({
        title: 'Succès',
        description: 'Accès ajouté avec succès'
      });
      fetchUsersWithAccess();
      setDialogOpen(false);
      setSelectedUser(null);
      setSelectedWorld('');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter l\'accès',
        variant: 'destructive'
      });
    }
  };

  const removeWorldAccess = async (userId: string, worldId: string) => {
    try {
      await adminAPI.removeUserWorldAccess(userId, worldId);
      toast({
        title: 'Succès',
        description: 'Accès retiré avec succès'
      });
      fetchUsersWithAccess();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer l\'accès',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="border-0 shadow-vuexy-md">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Gestion des Accès aux Mondes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Nom</TableHead>
              <TableHead className="font-semibold">Accès aux Mondes</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-6 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-8 w-24 bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : users.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/30">
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.display_name || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-wrap">
                    {user.worlds.length === 0 ? (
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                        Aucun accès
                      </Badge>
                    ) : (
                      user.worlds.map((world) => {
                        const themeColors = world.theme_colors || { primary: '#6b7280' };
                        return (
                          <Badge
                            key={world.id}
                            style={{
                              backgroundColor: `${themeColors.primary}15`,
                              color: themeColors.primary,
                              borderColor: `${themeColors.primary}30`
                            }}
                          >
                            {world.code}
                            <button
                              onClick={() => removeWorldAccess(user.id, world.id)}
                              className="ml-2 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        );
                      })
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Dialog open={dialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setSelectedUser(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter accès
                      </Button>
                    </DialogTrigger>
                          <DialogContent
                            aria-describedby="add-world-access-description"
                          >
                            <DialogHeader>
                              <DialogTitle>Ajouter un accès pour {user.email}</DialogTitle>
                            </DialogHeader>
                            <div id="add-world-access-description">
                              Sélectionnez un monde pour accorder l'accès à cet utilisateur.
                            </div>
                      <div className="space-y-4 py-4">
                        <Select value={selectedWorld} onValueChange={setSelectedWorld}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un monde" />
                          </SelectTrigger>
                          <SelectContent>
                            {allWorlds.map((world) => (
                              <SelectItem key={world.id} value={world.id}>
                                {world.name} ({world.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={addWorldAccess} className="w-full">
                          Ajouter
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
            {!loading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default WorldAccessManagement;
