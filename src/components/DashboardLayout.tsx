import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import UserProfileMenu from '@/components/UserProfileMenu';
import NotificationBell from '@/components/NotificationBell';
import AnimatedBackground from '@/components/AnimatedBackground';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthStore } from '@/lib/store';
import JDELogo from '@/assets/JDE.png';
import JDMOLogo from '@/assets/JDMO.png';
import DBCSLogo from '@/assets/DBCS.png';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { session } = useAuthStore();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full relative">
        <AnimatedBackground />
        <AppSidebar />

        <div className="flex-1 flex flex-col relative z-10">
          <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 shadow-sm sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="ml-2 flex items-center gap-3">
                <img src={JDELogo} alt="JDE" className="h-8 w-auto" />
                <img src={JDMOLogo} alt="JDMO" className="h-8 w-auto" />
                <img src={DBCSLogo} alt="DBCS" className="h-8 w-auto" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <NotificationBell />
              <UserProfileMenu />
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
