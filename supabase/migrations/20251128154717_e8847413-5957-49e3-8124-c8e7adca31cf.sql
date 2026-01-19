-- Create table for administrative documents checklist
CREATE TABLE IF NOT EXISTS public.dossier_admin_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  received BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dossier_id, document_type)
);

-- Enable RLS
ALTER TABLE public.dossier_admin_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view admin documents for accessible dossiers"
  ON public.dossier_admin_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dossiers d 
      WHERE d.id = dossier_admin_documents.dossier_id 
      AND has_world_access(auth.uid(), d.world_id)
    )
  );

CREATE POLICY "Users can insert admin documents for accessible dossiers"
  ON public.dossier_admin_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dossiers d 
      WHERE d.id = dossier_admin_documents.dossier_id 
      AND has_world_access(auth.uid(), d.world_id)
    )
  );

CREATE POLICY "Users can update admin documents for accessible dossiers"
  ON public.dossier_admin_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.dossiers d 
      WHERE d.id = dossier_admin_documents.dossier_id 
      AND has_world_access(auth.uid(), d.world_id)
    )
  );

CREATE POLICY "Users can delete admin documents for accessible dossiers"
  ON public.dossier_admin_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.dossiers d 
      WHERE d.id = dossier_admin_documents.dossier_id 
      AND has_world_access(auth.uid(), d.world_id)
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_dossier_admin_documents_updated_at
  BEFORE UPDATE ON public.dossier_admin_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();