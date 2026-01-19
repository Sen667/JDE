import { useEffect, useState } from 'react';
import { dossierAPI } from '@/integrations/laravel/api';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TransferHistoryBadgeProps {
  dossierId: string;
}

interface Transfer {
  id: string;
  transfer_type: string;
  transfer_status: string;
  transferred_at: string;
  source_world: { code: string; name: string };
  target_world: { code: string; name: string };
  source_dossier_id: string;
  target_dossier_id: string;
}

const TransferHistoryBadge = ({ dossierId }: TransferHistoryBadgeProps) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransfers();
  }, [dossierId]);

  const fetchTransfers = async () => {
    try {
      const result = await dossierAPI.getDossierTransferHistory(dossierId);
      if (result && result.transfers) {
        setTransfers(result.transfers as Transfer[]);
      } else {
        setTransfers([]);
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading || transfers.length === 0) {
    return null;
  }

  // Check if this dossier is the source or target
  const isSource = transfers.some(t => t.source_dossier_id === dossierId);
  const isTarget = transfers.some(t => t.target_dossier_id === dossierId);

  return (
    <TooltipProvider>
      <div className="flex gap-1">
        {isTarget && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Transféré depuis {transfers.find(t => t.target_dossier_id === dossierId)?.source_world.code}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-semibold">Transféré depuis :</p>
                <p className="text-sm">
                  {transfers.find(t => t.target_dossier_id === dossierId)?.source_world.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Le {format(new Date(transfers.find(t => t.target_dossier_id === dossierId)?.transferred_at || ''), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {isSource && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Transféré vers {transfers.find(t => t.source_dossier_id === dossierId)?.target_world.code}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-semibold">Transféré vers :</p>
                <p className="text-sm">
                  {transfers.find(t => t.source_dossier_id === dossierId)?.target_world.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Le {format(new Date(transfers.find(t => t.source_dossier_id === dossierId)?.transferred_at || ''), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default TransferHistoryBadge;
