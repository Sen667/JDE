import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { adminAPI } from '@/integrations/laravel/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import JDELogo from '@/assets/JDE.png';
import JDMOLogo from '@/assets/JDMO.png';
import DBCSLogo from '@/assets/DBCS.png';

interface World {
  id: string;
  code: string;
  name: string;
}

interface AddWorldAssociationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  currentWorldIds: string[];
  onSuccess?: () => void;
}

const AddWorldAssociationDialog = ({
  open,
  onOpenChange,
  clientId,
  currentWorldIds,
  onSuccess,
}: AddWorldAssociationDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [availableWorlds, setAvailableWorlds] = useState<World[]>([]);
  const [selectedWorldId, setSelectedWorldId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      fetchAvailableWorlds();
    }
  }, [open, currentWorldIds]);

  const fetchAvailableWorlds = async () => {
    try {
      // TODO: Implement Laravel API for getting user-accessible worlds
      // const result = await adminAPI.getUserAccessibleWorlds();
      // Filter out already associated worlds
      // const available = result.worlds.filter((w: World) => !currentWorldIds.includes(w.id));

      // Placeholder - show all worlds for now
      setAvailableWorlds([
        { id: 'jde', code: 'JDE', name: 'Justice Childhood' },
        { id: 'jdmo', code: 'JDMO', name: 'Development' },
        { id: 'dbcs', code: 'DBCS', name: 'Archives' }
      ].filter(w => !currentWorldIds.includes(w.id)));
    } catch (error) {
      console.error('Error fetching worlds:', error);
      toast.error('Erreur lors du chargement des mondes');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !selectedWorldId) return;

    try {
      setLoading(true);

      // TODO: Implement Laravel API for adding world associations
      // await adminAPI.addClientWorldAssociation(clientId, selectedWorldId, reason);

      toast.success('Monde associé avec succès (API implémention en attente)');
      setSelectedWorldId('');
      setReason('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding world association:', error);
      toast.error(error.message || 'Erreur lors de l\'association du monde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Associer un monde supplémentaire</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Monde *</Label>
            {availableWorlds.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center border rounded-lg">
                Tous les mondes sont déjà associés
              </div>
            ) : (
              <div className="flex gap-4 justify-center mt-3">
                {availableWorlds.map((world) => {
                  const isSelected = selectedWorldId === world.id;
                  const logoMap: Record<string, string> = {
                    JDE: JDELogo,
                    JDMO: JDMOLogo,
                    DBCS: DBCSLogo,
                  };
                  const logo = logoMap[world.code];
                  
                  return (
                    <button
                      key={world.id}
                      type="button"
                      onClick={() => setSelectedWorldId(world.id)}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        isSelected 
                          ? 'border-primary shadow-lg scale-105' 
                          : 'border-gray-300 grayscale opacity-50 hover:opacity-75'
                      }`}
                    >
                      <img src={logo} alt={world.name} className="h-12 w-auto" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Raison de l'association (optionnel)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Transfert dossier, Continuité..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !selectedWorldId || availableWorlds.length === 0}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Associer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddWorldAssociationDialog;
