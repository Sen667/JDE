-- Create enum for annotation types
CREATE TYPE annotation_type AS ENUM ('note', 'document_status', 'conversation', 'custom');

-- Create dossier_step_annotations table
CREATE TABLE public.dossier_step_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  workflow_step_id UUID REFERENCES public.workflow_steps(id) ON DELETE SET NULL,
  annotation_type annotation_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add workflow_step_id to tasks table
ALTER TABLE public.tasks 
ADD COLUMN workflow_step_id UUID REFERENCES public.workflow_steps(id) ON DELETE SET NULL;

-- Enable RLS on dossier_step_annotations
ALTER TABLE public.dossier_step_annotations ENABLE ROW LEVEL SECURITY;

-- RLS policies for dossier_step_annotations
CREATE POLICY "Users can view annotations for accessible dossiers"
ON public.dossier_step_annotations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM dossiers d
    WHERE d.id = dossier_step_annotations.dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
);

CREATE POLICY "Users can create annotations for accessible dossiers"
ON public.dossier_step_annotations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM dossiers d
    WHERE d.id = dossier_step_annotations.dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update their own annotations"
ON public.dossier_step_annotations
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own annotations"
ON public.dossier_step_annotations
FOR DELETE
USING (created_by = auth.uid());

-- Create index for performance
CREATE INDEX idx_annotations_dossier ON public.dossier_step_annotations(dossier_id);
CREATE INDEX idx_annotations_step ON public.dossier_step_annotations(workflow_step_id);
CREATE INDEX idx_tasks_workflow_step ON public.tasks(workflow_step_id);