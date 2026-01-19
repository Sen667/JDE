-- Rendre dossier_id nullable dans dossier_client_info pour permettre des fiches clients indépendantes
ALTER TABLE public.dossier_client_info 
ALTER COLUMN dossier_id DROP NOT NULL;

-- Créer un index pour améliorer les performances des requêtes sur les fiches clients sans dossier
CREATE INDEX idx_dossier_client_info_no_dossier ON public.dossier_client_info(id) WHERE dossier_id IS NULL;

-- Mettre à jour la politique RLS pour permettre aux utilisateurs de créer des fiches clients sans dossier
DROP POLICY IF EXISTS "Users can insert client info for their dossiers" ON public.dossier_client_info;

CREATE POLICY "Users can insert client info for their dossiers or standalone"
ON public.dossier_client_info
FOR INSERT
WITH CHECK (
  -- Soit c'est une fiche client standalone (pas de dossier)
  (dossier_id IS NULL AND auth.uid() IS NOT NULL)
  -- Soit c'est attaché à un dossier que l'utilisateur possède
  OR (
    dossier_id IS NOT NULL 
    AND EXISTS (
      SELECT 1
      FROM dossiers d
      WHERE d.id = dossier_client_info.dossier_id 
      AND d.owner_id = auth.uid() 
      AND has_world_access(auth.uid(), d.world_id)
    )
  )
);

-- Mettre à jour la politique de lecture pour inclure les fiches clients sans dossier
DROP POLICY IF EXISTS "Users can view client info for dossiers they can access" ON public.dossier_client_info;

CREATE POLICY "Users can view client info for accessible dossiers or standalone"
ON public.dossier_client_info
FOR SELECT
USING (
  -- Fiches clients standalone visibles par tous les utilisateurs authentifiés
  (dossier_id IS NULL AND auth.uid() IS NOT NULL)
  -- Ou fiches attachées à un dossier accessible
  OR (
    dossier_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM dossiers d
      WHERE d.id = dossier_client_info.dossier_id 
      AND has_world_access(auth.uid(), d.world_id)
    )
  )
);

-- Mettre à jour la politique de modification
DROP POLICY IF EXISTS "Users can update client info for their dossiers" ON public.dossier_client_info;

CREATE POLICY "Users can update client info for their dossiers or standalone"
ON public.dossier_client_info
FOR UPDATE
USING (
  -- Fiches clients standalone modifiables par tous
  (dossier_id IS NULL AND auth.uid() IS NOT NULL)
  -- Ou fiches attachées à leurs dossiers
  OR (
    dossier_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM dossiers d
      WHERE d.id = dossier_client_info.dossier_id 
      AND d.owner_id = auth.uid() 
      AND has_world_access(auth.uid(), d.world_id)
    )
  )
);