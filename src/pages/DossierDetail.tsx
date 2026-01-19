import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dossierAPI } from '@/integrations/laravel/api';
import { useAuthStore } from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, FileText, MessageSquare, User, LayoutDashboard, ArrowRight, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import OverviewTab from '@/components/dossier/OverviewTab';
import DocumentsTab from '@/components/dossier/DocumentsTab';
import CommentsTab from '@/components/dossier/CommentsTab';
import AppointmentsTab from '@/components/dossier/AppointmentsTab';
import ClientInfoTab from '@/components/dossier/ClientInfoTab';
import PhotosTab from '@/components/dossier/PhotosTab';

import TransferDossierDialog from '@/components/dossier/TransferDossierDialog';
import TransferHistoryBadge from '@/components/dossier/TransferHistoryBadge';

interface Dossier {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  world_id: string;
  owner_id: string;
  tags: string[];
  world: {
    code: string;
    name: string;
    theme_colors: any;
  };
  owner: {
    display_name: string;
    email: string;
  };
}

const DossierDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchDossier();
  }, [id]);

  // Apply world-specific background to body
  useEffect(() => {
    if (!dossier) return;
    
    const root = document.documentElement;
    const worldCode = dossier.world.code;
    
    // Remove any existing world classes
    root.classList.remove('world-jde', 'world-jdmo', 'world-dbcs');
    
    // Add current world class
    root.classList.add(`world-${worldCode.toLowerCase()}`);
    
    // Cleanup on unmount
    return () => {
      root.classList.remove('world-jde', 'world-jdmo', 'world-dbcs');
    };
  }, [dossier]);

  const fetchDossier = async () => {
    try {
      const response = await dossierAPI.getDossier(id!);
      if (response.dossier) {
        setDossier(response.dossier as Dossier);
      } else {
        throw new Error('Dossier not found');
      }
    } catch (error: any) {
      console.error('Error fetching dossier:', error);
      toast.error('Erreur lors du chargement du dossier');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      nouveau: "secondary",
      en_cours: "default",
      cloture: "outline",
    };
    return variants[status] || "default";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      nouveau: "Nouveau",
      en_cours: "En cours",
      cloture: "Clôturé",
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement du dossier...</p>
        </div>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Dossier introuvable</p>
      </div>
    );
  }

  // Déterminer la couleur du background selon le monde
  const getWorldGradient = (worldCode: string) => {
    switch (worldCode) {
      case 'JDE':
        return 'bg-gradient-to-br from-red-100 via-red-50/50 to-background dark:from-red-950/40 dark:via-red-900/20 dark:to-background';
      case 'JDMO':
        return 'bg-gradient-to-br from-orange-100 via-orange-50/50 to-background dark:from-orange-950/40 dark:via-orange-900/20 dark:to-background';
      case 'DBCS':
        return 'bg-gradient-to-br from-green-100 via-green-50/50 to-background dark:from-green-950/40 dark:via-green-900/20 dark:to-background';
      default:
        return 'bg-background';
    }
  };

  return (
    <div className={`min-h-screen w-full ${getWorldGradient(dossier.world.code)}`}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{dossier.title}</h1>
              <Badge variant={getStatusBadgeVariant(dossier.status)}>
                {getStatusLabel(dossier.status)}
              </Badge>
              <Badge
                variant="outline"
                style={{
                  borderColor: dossier.world.theme_colors.primary,
                  color: dossier.world.theme_colors.primary,
                }}
              >
                {dossier.world.code}
              </Badge>
              <TransferHistoryBadge dossierId={dossier.id} />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Créé le {format(new Date(dossier.created_at), 'dd MMMM yyyy', { locale: fr })}
              </span>
              <span>•</span>
              <span>Par {dossier.owner.display_name}</span>
              {dossier.updated_at !== dossier.created_at && (
                <>
                  <span>•</span>
                  <span>
                    Mis à jour le {format(new Date(dossier.updated_at), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                </>
              )}
            </div>
            {dossier.tags && dossier.tags.length > 0 && (
              <div className="flex gap-2 mt-2">
                {dossier.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Transfer button */}
          <div className="flex items-center gap-2">
            {(dossier.world.code === 'JDE' || dossier.world.code === 'JDMO') && (
              <Button
                onClick={() => setTransferDialogOpen(true)}
                variant="outline"
                size="sm"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Transférer le dossier
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="client">
              <User className="h-4 w-4 mr-2" />
              Client
            </TabsTrigger>
            <TabsTrigger value="appointments">
              <Calendar className="h-4 w-4 mr-2" />
              Rdv
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="photos">
              <Camera className="h-4 w-4 mr-2" />
              Photos / Plans
            </TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="h-4 w-4 mr-2" />
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab dossierId={dossier.id} worldId={dossier.world.id} />
          </TabsContent>

          <TabsContent value="client">
            <ClientInfoTab dossierId={dossier.id} />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentsTab dossierId={dossier.id} worldId={dossier.world.id} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab dossierId={dossier.id} />
          </TabsContent>

          <TabsContent value="photos">
            <PhotosTab dossierId={dossier.id} />
          </TabsContent>

          <TabsContent value="comments">
            <CommentsTab dossierId={dossier.id} />
          </TabsContent>
        </Tabs>

        {/* Transfer Dialog */}
        <TransferDossierDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          dossierId={dossier.id}
          currentWorldCode={dossier.world.code}
        />
      </div>
    </div>
  );
};

export default DossierDetail;
