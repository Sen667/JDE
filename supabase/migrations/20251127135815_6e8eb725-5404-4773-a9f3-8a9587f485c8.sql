-- Add dossier_id column to tasks table to properly isolate tasks per dossier
ALTER TABLE public.tasks ADD COLUMN dossier_id uuid REFERENCES public.dossiers(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_tasks_dossier_id ON public.tasks(dossier_id);

-- Update RLS policies to include dossier_id check
DROP POLICY IF EXISTS "Users can view tasks in their worlds" ON public.tasks;
CREATE POLICY "Users can view tasks in their worlds" 
ON public.tasks 
FOR SELECT 
TO authenticated
USING (
  has_world_access(auth.uid(), world_id) 
  AND (
    auth.uid() = assigned_to 
    OR auth.uid() = created_by 
    OR assigned_to IS NULL
  )
);