import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import UserRoleManagement from '@/components/admin/UserRoleManagement';
import WorldAccessManagement from '@/components/admin/WorldAccessManagement';
import TaskManagement from '@/components/admin/TaskManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Globe, CheckSquare } from 'lucide-react';

const Administration = () => {
  const { isSuperAdmin } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSuperAdmin()) {
      navigate('/dashboard');
    }
  }, [isSuperAdmin, navigate]);

  if (!isSuperAdmin()) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1 text-foreground">Administration</h2>
        <p className="text-sm text-muted-foreground">
          Gérez les utilisateurs, rôles, accès aux mondes et tâches
        </p>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Rôles
          </TabsTrigger>
          <TabsTrigger value="worlds" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Accès Mondes
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tâches
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <UserRoleManagement />
        </TabsContent>

        <TabsContent value="worlds">
          <WorldAccessManagement />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Administration;
