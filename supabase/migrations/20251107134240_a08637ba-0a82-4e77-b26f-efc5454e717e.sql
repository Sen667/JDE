-- Create dossier_transfers table for tracking inter-world transfers
CREATE TABLE IF NOT EXISTS public.dossier_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  source_world_id UUID NOT NULL REFERENCES public.worlds(id),
  target_world_id UUID NOT NULL REFERENCES public.worlds(id),
  target_dossier_id UUID REFERENCES public.dossiers(id) ON DELETE SET NULL,
  transfer_type TEXT NOT NULL, -- 'jde_to_jdmo', 'jdmo_to_dbcs', 'jde_to_dbcs'
  transfer_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  transferred_by UUID NOT NULL REFERENCES public.profiles(id),
  transferred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_dossier_transfers_source ON public.dossier_transfers(source_dossier_id);
CREATE INDEX idx_dossier_transfers_target ON public.dossier_transfers(target_dossier_id);
CREATE INDEX idx_dossier_transfers_status ON public.dossier_transfers(transfer_status);
CREATE INDEX idx_dossier_transfers_type ON public.dossier_transfers(transfer_type);

-- Enable RLS
ALTER TABLE public.dossier_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view transfers for accessible dossiers"
ON public.dossier_transfers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_transfers.source_dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_transfers.target_dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
);

CREATE POLICY "Users can create transfers for their dossiers"
ON public.dossier_transfers
FOR INSERT
WITH CHECK (
  transferred_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = source_dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
);

CREATE POLICY "System can update transfer status"
ON public.dossier_transfers
FOR UPDATE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_dossier_transfers_updated_at
BEFORE UPDATE ON public.dossier_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Add comment to dossiers table to track transfer info
COMMENT ON TABLE public.dossier_transfers IS 'Tracks transfers of dossiers between different worlds (JDE, JDMO, DBCS)';