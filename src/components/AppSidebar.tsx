import { Home, FolderOpen, Settings, Shield, LogOut, TrendingUp, Sparkles, Building2, Scale, Archive, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/integrations/laravel/client';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const AppSidebar = () => {
  const { state } = useSidebar();
  const { accessibleWorlds, isSuperAdmin, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/auth');
  };

  const isCollapsed = state === 'collapsed';
  const isActive = (path: string) => location.pathname === path;

  // Check if user has access to a specific world
  const hasWorldAccess = (worldCode: string) => {
    return accessibleWorlds.some(world => world.code === worldCode);
  };

  return (
    <Sidebar className={isCollapsed ? 'w-14' : 'w-60'} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {!isCollapsed && <span>Navigation</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/dashboard')}
                  className={`relative transition-all duration-200 ${
                    isActive('/dashboard') 
                      ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold border-l-4 border-primary shadow-md' 
                      : 'hover:bg-accent hover:translate-x-1'
                  }`}
                >
                  <Home className={`h-5 w-5 ${isActive('/dashboard') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Accueil</span>}
                  {isActive('/dashboard') && (
                    <div className="absolute right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/dossiers')}
                  className={`relative transition-all duration-200 ${
                    isActive('/dossiers') 
                      ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold border-l-4 border-primary shadow-md' 
                      : 'hover:bg-accent hover:translate-x-1'
                  }`}
                >
                  <FolderOpen className={`h-5 w-5 ${isActive('/dossiers') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Tous les Dossiers</span>}
                  {isActive('/dossiers') && (
                    <div className="absolute right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/clients')}
                  className={`relative transition-all duration-200 ${
                    isActive('/clients') 
                      ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold border-l-4 border-primary shadow-md' 
                      : 'hover:bg-accent hover:translate-x-1'
                  }`}
                >
                  <Users className={`h-5 w-5 ${isActive('/clients') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Fiches Clients</span>}
                  {isActive('/clients') && (
                    <div className="absolute right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {hasWorldAccess('JDE') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/jde/dossiers')}
                    className={`relative transition-all duration-200 ${
                      isActive('/jde/dossiers')
                        ? 'bg-gradient-to-r from-red-100 to-red-50 text-red-700 font-semibold border-l-4 border-red-600 shadow-md'
                        : 'hover:bg-accent hover:translate-x-1'
                    }`}
                  >
                    <Scale className={`h-5 w-5 ${isActive('/jde/dossiers') ? 'text-red-600' : ''}`} />
                    {!isCollapsed && <span>Dossiers JDE</span>}
                    {isActive('/jde/dossiers') && (
                      <div className="absolute right-2 w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {hasWorldAccess('JDMO') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/jdmo/dossiers')}
                    className={`relative transition-all duration-200 ${
                      isActive('/jdmo/dossiers')
                        ? 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 font-semibold border-l-4 border-orange-600 shadow-md'
                        : 'hover:bg-accent hover:translate-x-1'
                    }`}
                  >
                    <Building2 className={`h-5 w-5 ${isActive('/jdmo/dossiers') ? 'text-orange-600' : ''}`} />
                    {!isCollapsed && <span>Dossiers JDMO</span>}
                    {isActive('/jdmo/dossiers') && (
                      <div className="absolute right-2 w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {hasWorldAccess('DBCS') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/dbcs/dossiers')}
                    className={`relative transition-all duration-200 ${
                      isActive('/dbcs/dossiers')
                        ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 font-semibold border-l-4 border-green-600 shadow-md'
                        : 'hover:bg-accent hover:translate-x-1'
                    }`}
                  >
                    <Archive className={`h-5 w-5 ${isActive('/dbcs/dossiers') ? 'text-green-600' : ''}`} />
                    {!isCollapsed && <span>Dossiers DBCS</span>}
                    {isActive('/dbcs/dossiers') && (
                      <div className="absolute right-2 w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin() && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-destructive font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {!isCollapsed && <span>Superadmin</span>}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate('/superadmin/administration')}
                    className={`relative transition-all duration-200 ${
                      isActive('/superadmin/administration') 
                        ? 'bg-gradient-to-r from-destructive/15 to-destructive/5 text-destructive font-semibold border-l-4 border-destructive shadow-md' 
                        : 'hover:bg-accent hover:translate-x-1'
                    }`}
                  >
                    <Shield className={`h-5 w-5 ${isActive('/superadmin/administration') ? 'text-destructive' : ''}`} />
                    {!isCollapsed && <span>Administration</span>}
                    {isActive('/superadmin/administration') && (
                      <div className="absolute right-2 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate('/superadmin/analytics')}
                    className={`relative transition-all duration-200 ${
                      isActive('/superadmin/analytics') 
                        ? 'bg-gradient-to-r from-destructive/15 to-destructive/5 text-destructive font-semibold border-l-4 border-destructive shadow-md' 
                        : 'hover:bg-accent hover:translate-x-1'
                    }`}
                  >
                    <TrendingUp className={`h-5 w-5 ${isActive('/superadmin/analytics') ? 'text-destructive' : ''}`} />
                    {!isCollapsed && <span>Analytiques</span>}
                    {isActive('/superadmin/analytics') && (
                      <div className="absolute right-2 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:translate-x-1"
            >
              <LogOut className="h-5 w-5" />
              {!isCollapsed && <span>Déconnexion</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
