import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Mailbox from "./pages/Mailbox";
import DashboardLayout from "./components/DashboardLayout";
import Users from "./pages/superadmin/Users";
import Administration from "./pages/superadmin/Administration";
import Analytics from "./pages/superadmin/Analytics";
import Dossiers from "./pages/world/Dossiers";
import DossiersJDMO from "./pages/world/DossiersJDMO";
import DossiersJDE from "./pages/world/DossiersJDE";
import DossiersDBCS from "./pages/world/DossiersDBCS";
import AllDossiers from "./pages/AllDossiers";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import DossierDetail from "./pages/DossierDetail";
import ClientsManagement from "./pages/ClientsManagement";
import { useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./components/ThemeProvider";
import { PageTransition } from "./components/PageTransition";

const queryClient = new QueryClient();

const AuthBootstrap = () => {
  // Initialize auth globally so session is ready before navigating
  // This prevents the "login twice" issue caused by guards running before state is set
  useAuth();
  return null;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/dashboard" element={<DashboardLayout><PageTransition><Dashboard /></PageTransition></DashboardLayout>} />
        <Route path="/mailbox" element={<DashboardLayout><PageTransition><Mailbox /></PageTransition></DashboardLayout>} />
        <Route path="/dossiers" element={<DashboardLayout><PageTransition><AllDossiers /></PageTransition></DashboardLayout>} />
        <Route path="/dossier/:id" element={<DashboardLayout><PageTransition><DossierDetail /></PageTransition></DashboardLayout>} />
        <Route path="/clients" element={<DashboardLayout><PageTransition><ClientsManagement /></PageTransition></DashboardLayout>} />
        <Route path="/superadmin/users" element={<DashboardLayout><PageTransition><Users /></PageTransition></DashboardLayout>} />
        <Route path="/superadmin/administration" element={<DashboardLayout><PageTransition><Administration /></PageTransition></DashboardLayout>} />
        <Route path="/superadmin/analytics" element={<DashboardLayout><PageTransition><Analytics /></PageTransition></DashboardLayout>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/jde/dossiers" element={<DashboardLayout><PageTransition><DossiersJDE /></PageTransition></DashboardLayout>} />
        <Route path="/jde/dossiers/:id" element={<DashboardLayout><PageTransition><DossierDetail /></PageTransition></DashboardLayout>} />
        <Route path="/jdmo/dossiers" element={<DashboardLayout><PageTransition><DossiersJDMO /></PageTransition></DashboardLayout>} />
        <Route path="/jdmo/dossiers/:id" element={<DashboardLayout><PageTransition><DossierDetail /></PageTransition></DashboardLayout>} />
        <Route path="/dbcs/dossiers" element={<DashboardLayout><PageTransition><DossiersDBCS /></PageTransition></DashboardLayout>} />
        <Route path="/dbcs/dossiers/:id" element={<DashboardLayout><PageTransition><DossierDetail /></PageTransition></DashboardLayout>} />
        <Route path=":worldCode/dossiers" element={<DashboardLayout><PageTransition><Dossiers /></PageTransition></DashboardLayout>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="multiworld-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/multi-world-hub">
          <AuthBootstrap />
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
