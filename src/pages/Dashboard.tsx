import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/store';
import { worldAPI } from '@/integrations/laravel/api';
import WorldCard3D from '@/components/WorldCard3D';
import { Card, CardContent } from '@/components/ui/card';
import { FolderOpen, Clock, AlertCircle } from 'lucide-react';
import UnifiedTasksPanel from '@/components/UnifiedTasksPanel';

interface WorldStats {
  total: number;
  en_cours: number;
  en_attente: number;
}

const Dashboard = () => {
  const { accessibleWorlds: unsortedWorlds, profile } = useAuthStore();
  
  // Sort worlds in the correct order: JDE, JDMO, DBCS - MEMOIZED to prevent infinite loops
  const accessibleWorlds = useMemo(() => {
    return [...unsortedWorlds].sort((a, b) => {
      const order = { 'JDE': 1, 'JDMO': 2, 'DBCS': 3 };
      return order[a.code] - order[b.code];
    });
  }, [unsortedWorlds]);

  const [worldStats, setWorldStats] = useState<Record<string, WorldStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessibleWorlds.length > 0) {
      fetchWorldStats();
    }
  }, [accessibleWorlds.length]);

  const fetchWorldStats = async () => {
    try {
      const statsMap: Record<string, WorldStats> = {};

      for (const world of accessibleWorlds) {
        try {
          // Use the Laravel API helper properly - get first page with large page size
          // @ts-expect-error - API typing doesn't include per_page but WorldController supports it
          const result = await worldAPI.getWorldDossiers(world.id, { page: 1, per_page: 1000 });

          if (result && result.dossiers) {
            // Calculate stats from the returned dossiers
            const dossiers = result.dossiers;
            const total = dossiers.length;
            const en_cours = dossiers.filter((d: { status: string }) => d.status === 'en_cours').length;
            const nouveau = dossiers.filter((d: { status: string }) => d.status === 'nouveau').length;

            statsMap[world.code] = {
              total: total || 0,
              en_cours: en_cours || 0,
              en_attente: nouveau || 0,
            };
          } else {
            // Default stats if API call fails
            statsMap[world.code] = {
              total: 0,
              en_cours: 0,
              en_attente: 0,
            };
          }
        } catch (error) {
          console.warn(`Could not fetch stats for world ${world.code}:`, error);
          // Default stats if API call fails
          statsMap[world.code] = {
            total: 0,
            en_cours: 0,
            en_attente: 0,
          };
        }
      }

      setWorldStats(statsMap);
    } catch (error) {
      console.error('Error fetching world stats:', error);

      // Set default stats on error
      const statsMap: Record<string, WorldStats> = {};
      accessibleWorlds.forEach(world => {
        statsMap[world.code] = {
          total: 0,
          en_cours: 0,
          en_attente: 0,
        };
      });
      setWorldStats(statsMap);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1 text-foreground">
          Bienvenue{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h2>
        <p className="text-sm text-muted-foreground">
          {profile?.email}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Accédez à vos espaces de travail et consultez vos derniers dossiers
        </p>
      </div>

      {/* 3D World Cards with Info */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-foreground">Vos dossiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accessibleWorlds.map((world) => {
            const stats = worldStats[world.code];
            return (
              <div key={world.id} className="space-y-4">
                {/* Stats au-dessus de la carte */}
                {stats && (
                  <div className="grid grid-cols-3 gap-2">
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-3 flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FolderOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-lg font-bold">{stats.total}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-3 flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <Clock className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">En cours</p>
                          <p className="text-lg font-bold">{stats.en_cours}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-3 flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">En attente</p>
                          <p className="text-lg font-bold">{stats.en_attente}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                <WorldCard3D world={world} />
              </div>
            );
          })}
        </div>

        {/* Unified Tasks Panel */}
        {!loading && accessibleWorlds.length > 0 && (
          <div className="mt-8">
            <UnifiedTasksPanel accessibleWorlds={accessibleWorlds} />
          </div>
        )}
      </section>

      {!loading && accessibleWorlds.length === 0 && (
        <Card className="text-center py-12 shadow-vuexy-md border-0">
          <CardContent className="py-8">
            <p className="text-muted-foreground">
              Vous n'avez accès à aucun monde pour le moment.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
