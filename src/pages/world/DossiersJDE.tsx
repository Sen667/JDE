import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dossierAPI } from '@/integrations/laravel/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, FileText, Plus, Filter, Download, MoreHorizontal, Eye, Calendar, Mail, BarChart3, Scale, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CreateDossierDialog from '@/components/dossier/CreateDossierDialog';
import { toast } from 'sonner';
import JDELogo from '@/assets/JDE.png';
import { DeleteDossierDialog } from '@/components/dossier/DeleteDossierDialog';

interface Dossier {
  id: string;
  title: string;
  status: string;
  created_at: string;
  owner: { display_name: string | null };
  tags: string[] | null;
}

interface World {
  id: string;
  code: string;
  name: string;
  description: string;
}

const DossiersJDE = () => {
  // JDE uses red color theme
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [world, setWorld] = useState<World | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dossierToDelete, setDossierToDelete] = useState<Dossier | null>(null);

  useEffect(() => {
    fetchWorldAndDossiers();

    // Listen for dossier workflow updates from timeline
    const handleWorkflowUpdate = () => {
      fetchWorldAndDossiers();
    };

    window.addEventListener('dossierWorkflowUpdated', handleWorkflowUpdate);

    return () => {
      window.removeEventListener('dossierWorkflowUpdated', handleWorkflowUpdate);
    };
  }, []);

  // Apply world-specific background to body
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('world-jde', 'world-jdmo', 'world-dbcs');
    root.classList.add('world-jde');
    
    return () => {
      root.classList.remove('world-jde');
    };
  }, []);

  const fetchWorldAndDossiers = async () => {
    try {
      // Fetch JDE world data using Laravel API
      const worldsResponse = await dossierAPI.getDossiers({ world: 'JDE' });
      if (worldsResponse.dossiers) {
        // Get the first dossier to extract world info
        if (worldsResponse.dossiers.length > 0) {
          const firstDossier = worldsResponse.dossiers[0];
          if (firstDossier.world) {
            setWorld(firstDossier.world);
          }
        }

        // Set dossiers filtered by JDE world
        setDossiers(worldsResponse.dossiers.map((d: any) => ({
          ...d,
          owner: d.owner || { display_name: 'Inconnu' },
        })));
      } else {
        // Fallback to hardcoded JDE world data if no dossiers exist
        setWorld({
          id: '1', // Default ID for JDE
          code: 'JDE',
          name: 'Justice de l\'Enfance',
          description: 'Service de protection de l\'enfance'
        });
        setDossiers([]);
      }
    } catch (error) {
      console.error('Error fetching JDE data:', error);
      // Set fallback data for UI
      setWorld({
        id: '1',
        code: 'JDE',
        name: 'Justice de l\'Enfance',
        description: 'Service de protection de l\'enfance'
      });
      setDossiers([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrefetchDossier = async (dossierId: string) => {
    try {
      const result = await dossierAPI.getDossier(dossierId);
      if (result.dossier) {
        sessionStorage.setItem(`dossier_${dossierId}`, JSON.stringify(result.dossier));
      }
    } catch (error) {
      console.error('Error prefetching dossier:', error);
    }
  };

  const handleDownloadDossier = async (dossierId: string, dossierTitle: string) => {
    try {
      toast.loading('Préparation du téléchargement...', {
        id: 'download-dossier',
      });

      const response = await fetch(`/api/dossiers/${dossierId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': '',
        },
      });

      if (!response.ok) {
        throw new Error('Téléchargement échoué');
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Extract filename from response headers or create one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `dossier_${dossierId}.zip`;

      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="([^"]+)"/);
        if (matches) {
          filename = matches[1];
        }
      }

      // Create download link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Dossier téléchargé avec succès', {
        id: 'download-dossier',
      });
    } catch (error) {
      console.error('Error downloading dossier:', error);
      toast.error('Erreur lors du téléchargement du dossier', {
        id: 'download-dossier',
      });
    }
  };

  const handleDeleteDossier = async () => {
    if (!dossierToDelete) return;

    try {
      await dossierAPI.deleteDossier(dossierToDelete.id);

      toast.success(`Le dossier "${dossierToDelete.title}" a été supprimé avec succès.`);
      fetchWorldAndDossiers();
    } catch (error: any) {
      console.error('Error deleting dossier:', error);
      toast.error('Impossible de supprimer le dossier.');
    } finally {
      setDeleteDialogOpen(false);
      setDossierToDelete(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'nouveau':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'en_cours':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cloture':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'nouveau':
        return 'Nouveau';
      case 'en_cours':
        return 'En cours';
      case 'cloture':
        return 'Clôturé';
      default:
        return status;
    }
  };

  const filteredDossiers = dossiers.filter((dossier) => {
    const matchesSearch = dossier.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || dossier.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: dossiers.length,
    nouveau: dossiers.filter(d => d.status === 'nouveau').length,
    en_cours: dossiers.filter(d => d.status === 'en_cours').length,
    cloture: dossiers.filter(d => d.status === 'cloture').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement des dossiers JDE...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 via-red-50/50 to-background dark:from-red-950/40 dark:via-red-900/20 dark:to-background p-6">
    <div className="space-y-6">
      {/* Header avec logo JDE */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <img src={JDELogo} alt="JDE" className="h-16 w-16" />
          <div>
            <h2 className="text-3xl font-bold mb-1 text-red-600">
              JDE - Justice et Droit des Expertises
            </h2>
            <p className="text-sm text-muted-foreground">
              Gestion des dossiers d'expertise et suivi juridique
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => navigate('/mailbox')}
            size="sm"
            className="border-red-600 text-red-600 hover:bg-red-50"
            variant="outline"
          >
            <Mail className="h-4 w-4 mr-2" />
            Messages
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            size="sm"
            className="border-red-600 text-red-600 hover:bg-red-50"
            variant="outline"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Agenda
          </Button>
          <Button
            size="sm"
            className="border-red-600 text-red-600 hover:bg-red-50"
            variant="outline"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Statistiques
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            size="sm"
            variant="ghost"
            className="bg-red-600 hover:bg-red-700 text-white shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau dossier JDE
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-red-200" onClick={() => setStatusFilter('all')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dossiers</CardTitle>
            <Scale className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Tous les dossiers</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-200" onClick={() => setStatusFilter('nouveau')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux</CardTitle>
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.nouveau}</div>
            <p className="text-xs text-muted-foreground">En attente d'expertise</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-amber-200" onClick={() => setStatusFilter('en_cours')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <div className="h-2 w-2 rounded-full bg-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.en_cours}</div>
            <p className="text-xs text-muted-foreground">Expertises actives</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200" onClick={() => setStatusFilter('cloture')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clôturés</CardTitle>
            <div className="h-2 w-2 rounded-full bg-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{stats.cloture}</div>
            <p className="text-xs text-muted-foreground">Expertises terminées</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des dossiers */}
      <Card className="shadow-vuexy-md border-0">
        <CardHeader className="border-b bg-card">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <div className="p-2 rounded-lg bg-red-600/10">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              {statusFilter === 'all' ? 'Tous les dossiers JDE' : `Dossiers ${getStatusLabel(statusFilter)}`}
              <Badge variant="secondary">{filteredDossiers.length}</Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button size="sm" className="border-red-600 text-red-600 hover:bg-red-50" variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtrer
              </Button>
              <Button size="sm" className="border-red-600 text-red-600 hover:bg-red-50" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Search bar */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un dossier JDE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Dossiers list */}
          <div className="divide-y">
            {filteredDossiers.map((dossier) => (
              <div
                key={dossier.id}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                onMouseEnter={() => handlePrefetchDossier(dossier.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{dossier.title}</h4>
                    <Badge className={getStatusBadgeColor(dossier.status)}>
                      {getStatusLabel(dossier.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      📅 {format(new Date(dossier.created_at), 'dd MMM yyyy', { locale: fr })}
                    </span>
                    <span>👤 {dossier.owner?.display_name || 'Inconnu'}</span>
                    {dossier.tags && dossier.tags.length > 0 && (
                      <span className="text-xs flex gap-1">
                        🏷️ {dossier.tags.slice(0, 2).join(', ')}
                        {dossier.tags.length > 2 && ` +${dossier.tags.length - 2}`}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    onClick={() => navigate(`/dossier/${dossier.id}`)}
                    size="sm"
                    variant="ghost"
                    className="bg-red-600 hover:bg-red-700 text-white shadow-md"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Voir le détail
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate(`/dossier/${dossier.id}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Voir les détails
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Calendar className="h-4 w-4 mr-2" />
                        Planifier un RDV
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 mr-2" />
                        Envoyer un email
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDownloadDossier(dossier.id, dossier.title)}>
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger le dossier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setDossierToDelete(dossier);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer le dossier
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {filteredDossiers.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <div className="p-4 rounded-full bg-red-50 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Scale className="h-10 w-10 text-red-600 opacity-40" />
                </div>
                <p className="text-sm font-medium">Aucun dossier JDE trouvé</p>
                <p className="text-xs mt-1">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Essayez de modifier vos filtres'
                    : 'Créez votre premier dossier JDE pour commencer'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    variant="ghost"
                    className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un dossier JDE
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog - Always rendered so button works */}
      <CreateDossierDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        worldId={world?.id || '1'}
        onSuccess={fetchWorldAndDossiers}
      />

      <DeleteDossierDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteDossier}
        dossierTitle={dossierToDelete?.title}
      />
    </div>
    </div>
  );
};

export default DossiersJDE;
