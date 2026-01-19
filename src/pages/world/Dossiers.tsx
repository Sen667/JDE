import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dossierAPI } from '@/integrations/laravel/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, FileText, Plus, Filter, Download, MoreHorizontal, Eye, Calendar, Mail, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CreateDossierDialog from '@/components/dossier/CreateDossierDialog';
import { toast } from 'sonner';

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

const Dossiers = () => {
  const { worldCode } = useParams<{ worldCode: string }>();
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [world, setWorld] = useState<World | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchWorldAndDossiers();
  }, [worldCode]);

  const fetchWorldAndDossiers = async () => {
    if (!worldCode) return;

    try {
      const upperCode = worldCode.toUpperCase() as 'JDE' | 'JDMO' | 'DBCS';

      // TODO: Implement Laravel API for getting world details
      // const worldResult = await adminAPI.getWorldByCode(upperCode);
      // setWorld(worldResult.world);

      // Placeholder world data
      setWorld({
        id: upperCode.toLowerCase(),
        code: upperCode,
        name: upperCode === 'JDE' ? 'Justice Childhood' : upperCode === 'JDMO' ? 'Development' : 'Archives',
        description: `Gestion des dossiers ${upperCode}`
      });

      // TODO: Implement Laravel API for getting world dossiers
      // const dossiersResult = await dossierAPI.getWorldDossiers(worldData.id);

      // Placeholder dossiers data
      setDossiers([]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handlePrefetchDossier = (dossierId: string) => {
    // TODO: Implement Laravel API prefetch for dossier details
    // const result = await dossierAPI.getDossier(dossierId);
    // sessionStorage.setItem(`dossier_${dossierId}`, JSON.stringify(result.dossier));
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
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header avec menu d'actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-1">
              {world?.name || worldCode?.toUpperCase()}
            </h2>
            <p className="text-sm text-muted-foreground">
              {world?.description || 'Gérez et consultez tous vos dossiers'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => navigate('/mailbox')}
              variant="outline"
              size="sm"
            >
              <Mail className="h-4 w-4 mr-2" />
              Messages
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              size="sm"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Agenda
            </Button>
            <Button
              variant="outline"
              size="sm"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Statistiques
            </Button>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau dossier
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('all')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
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
              <p className="text-xs text-muted-foreground">En attente de traitement</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-amber-200" onClick={() => setStatusFilter('en_cours')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En cours</CardTitle>
              <div className="h-2 w-2 rounded-full bg-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.en_cours}</div>
              <p className="text-xs text-muted-foreground">En traitement</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200" onClick={() => setStatusFilter('cloture')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clôturés</CardTitle>
              <div className="h-2 w-2 rounded-full bg-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-600">{stats.cloture}</div>
              <p className="text-xs text-muted-foreground">Terminés</p>
            </CardContent>
          </Card>
        </div>

        {/* Liste des dossiers */}
        <Card className="shadow-vuexy-md border-0">
          <CardHeader className="border-b bg-card">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                {statusFilter === 'all' ? 'Tous les dossiers' : `Dossiers ${getStatusLabel(statusFilter)}`}
                <Badge variant="secondary">{filteredDossiers.length}</Badge>
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrer
                </Button>
                <Button variant="outline" size="sm">
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
                  placeholder="Rechercher un dossier..."
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
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger le dossier
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}

              {filteredDossiers.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="p-4 rounded-full bg-muted/50 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <FileText className="h-10 w-10 opacity-40" />
                  </div>
                  <p className="text-sm font-medium">Aucun dossier trouvé</p>
                  <p className="text-xs mt-1">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Essayez de modifier vos filtres'
                      : 'Créez votre premier dossier pour commencer'}
                  </p>
                  {!searchQuery && statusFilter === 'all' && (
                    <Button
                      onClick={() => setCreateDialogOpen(true)}
                      className="mt-4"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un dossier
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        {world && (
          <CreateDossierDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            worldId={world.id}
            onSuccess={fetchWorldAndDossiers}
          />
        )}
      </div>
    );
  };

export default Dossiers;
