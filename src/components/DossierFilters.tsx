import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { World } from '@/lib/store';

interface DossierFiltersProps {
  worlds: World[];
  selectedWorlds: string[];
  selectedStatus: string;
  searchQuery: string;
  onWorldsChange: (worldCodes: string[]) => void;
  onStatusChange: (status: string) => void;
  onSearchChange: (query: string) => void;
  onReset: () => void;
  resultCount: number;
}

const DossierFilters = ({
  worlds,
  selectedWorlds,
  selectedStatus,
  searchQuery,
  onWorldsChange,
  onStatusChange,
  onSearchChange,
  onReset,
  resultCount,
}: DossierFiltersProps) => {
  // Mapping des couleurs corrigées par code de monde
  const colorMap: Record<string, string> = {
    JDE: 'hsl(0, 85%, 58%)',      // Rouge
    JDMO: 'hsl(25, 95%, 60%)',    // Orange
    DBCS: 'hsl(145, 65%, 48%)',   // Vert
  };

  // Ordre d'affichage fixe des mondes
  const worldOrder = ['JDE', 'JDMO', 'DBCS'];
  const sortedWorlds = [...worlds].sort((a, b) => 
    worldOrder.indexOf(a.code) - worldOrder.indexOf(b.code)
  );

  const toggleWorld = (worldCode: string) => {
    if (selectedWorlds.includes(worldCode)) {
      onWorldsChange(selectedWorlds.filter((w) => w !== worldCode));
    } else {
      onWorldsChange([...selectedWorlds, worldCode]);
    }
  };

  const hasActiveFilters = selectedWorlds.length > 0 || selectedStatus !== 'all' || searchQuery !== '';

  return (
    <div className="space-y-5 p-5 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">Filtres</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset} className="h-8">
            <X className="h-3.5 w-3.5 mr-1" />
            Réinitialiser
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* World Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Mondes</label>
          <div className="flex flex-wrap gap-2">
            {sortedWorlds.map((world) => {
              const isSelected = selectedWorlds.includes(world.code);
              const worldColor = colorMap[world.code] || world.theme_colors.primary;
              return (
                <Badge
                  key={world.id}
                  variant="default"
                  className="cursor-pointer transition-all hover:scale-105 hover:brightness-90"
                  style={{
                    backgroundColor: worldColor,
                    color: 'white',
                    borderColor: worldColor,
                    opacity: isSelected ? 1 : 0.7,
                  }}
                  onClick={() => toggleWorld(world.code)}
                >
                  {world.code}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Statut</label>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="nouveau">Nouveau</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="cloture">Clôturé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Recherche</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Titre ou tags..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t">
        <div className="text-xs text-muted-foreground font-medium">
          {resultCount} dossier{resultCount !== 1 ? 's' : ''} trouvé{resultCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};

export default DossierFilters;
