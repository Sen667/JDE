-- Étape 1 : Rendre assigned_to nullable dans la table tasks
ALTER TABLE public.tasks ALTER COLUMN assigned_to DROP NOT NULL;

-- Mettre à jour les politiques RLS pour permettre de voir les tâches non assignées
DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks they created" ON public.tasks;

-- Nouvelle politique : Les utilisateurs peuvent voir les tâches assignées à eux, créées par eux, ou non assignées dans leurs mondes
CREATE POLICY "Users can view tasks in their worlds"
ON public.tasks
FOR SELECT
USING (
  has_world_access(auth.uid(), world_id) AND (
    auth.uid() = assigned_to OR 
    auth.uid() = created_by OR 
    assigned_to IS NULL
  )
);

-- Politique pour la mise à jour : Les utilisateurs peuvent mettre à jour les tâches assignées à eux ou les tâches non assignées dans leurs mondes
DROP POLICY IF EXISTS "Users can update tasks assigned to them" ON public.tasks;

CREATE POLICY "Users can update tasks in their worlds"
ON public.tasks
FOR UPDATE
USING (
  has_world_access(auth.uid(), world_id) AND (
    auth.uid() = assigned_to OR 
    assigned_to IS NULL
  )
);