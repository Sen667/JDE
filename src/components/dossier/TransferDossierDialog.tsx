import { useState } from 'react';
import { dossierAPI } from '@/integrations/laravel/api';
import { useAuthStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TransferDossierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  currentWorldCode: string;
}

const TransferDossierDialog = ({ 
  open, 
  onOpenChange, 
  dossierId, 
  currentWorldCode 
}: TransferDossierDialogProps) => {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [targetWorld, setTargetWorld] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Define allowed transfers based on current world
  const getAllowedTransfers = () => {
    const transfers: { value: string; label: string; description: string }[] = [];
    
    if (currentWorldCode === 'JDE') {
      transfers.push(
        { 
          value: 'JDMO', 
          label: 'JDMO - Maîtrise d\'Œuvre', 
          description: 'Transférer vers le monde de la maîtrise d\'œuvre' 
        },
        { 
          value: 'DBCS', 
          label: 'DBCS - Archivage', 
          description: 'Transférer directement vers l\'archivage' 
        }
      );
    } else if (currentWorldCode === 'JDMO') {
      transfers.push(
        { 
          value: 'DBCS', 
          label: 'DBCS - Archivage', 
          description: 'Transférer vers l\'archivage après maîtrise d\'œuvre' 
        }
      );
    }
    
    return transfers;
  };

  const allowedTransfers = getAllowedTransfers();

  const handleTransfer = async () => {
    if (!targetWorld) {
      toast.error('Veuillez sélectionner un monde de destination');
      return;
    }

    setLoading(true);

    try {
      // Call the Laravel transfer API
      const result = await dossierAPI.initiateTransfer({
        dossier_id: dossierId,
        target_world: targetWorld
      });

      if (result.success) {
        toast.success(result.message || 'Dossier transféré avec succès');
        onOpenChange(false);

        // Navigate to the new dossier
        if (result.new_dossier_id) {
          setTimeout(() => {
            navigate(`/dossier/${result.new_dossier_id}`);
          }, 1000);
        }
      } else {
        throw new Error(result.error || 'Erreur lors du transfert');
      }
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'Erreur lors du transfert du dossier');
    } finally {
      setLoading(false);
    }
  };

  if (allowedTransfers.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfert impossible</DialogTitle>
            <DialogDescription>
              Les dossiers {currentWorldCode} ne peuvent pas être transférés vers d'autres mondes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Transférer le dossier
          </DialogTitle>
          <DialogDescription>
            Transférez ce dossier vers un autre monde. Les informations du client et les documents seront copiés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="target-world">Monde de destination</Label>
            <Select
              value={targetWorld}
              onValueChange={setTargetWorld}
              disabled={loading}
            >
              <SelectTrigger id="target-world">
                <SelectValue placeholder="Sélectionnez un monde" />
              </SelectTrigger>
              <SelectContent>
                {allowedTransfers.map((transfer) => (
                  <SelectItem key={transfer.value} value={transfer.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{transfer.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {transfer.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="text-sm font-semibold">Ce qui sera transféré :</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Informations du client</li>
              <li>Documents et pièces jointes</li>
              <li>Commentaires et historique</li>
              <li>Nouveau workflow initialisé pour le monde cible</li>
            </ul>
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Le dossier source restera disponible avec un lien vers le dossier transféré.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!targetWorld || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transférer le dossier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferDossierDialog;
