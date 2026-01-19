-- Étape 1.1: Ajouter la colonne primary_world_id à dossier_client_info
ALTER TABLE dossier_client_info 
ADD COLUMN primary_world_id uuid REFERENCES worlds(id);

-- Étape 1.2: Créer la table de jonction client_world_associations
CREATE TABLE client_world_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES dossier_client_info(id) ON DELETE CASCADE,
  world_id uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  associated_at timestamp with time zone DEFAULT now(),
  association_reason text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(client_id, world_id)
);

-- Étape 1.3: Activer RLS sur la nouvelle table
ALTER TABLE client_world_associations ENABLE ROW LEVEL SECURITY;

-- Politique: les utilisateurs peuvent voir les associations des mondes auxquels ils ont accès
CREATE POLICY "Users can view client associations for accessible worlds"
ON client_world_associations FOR SELECT
USING (has_world_access(auth.uid(), world_id));

-- Politique: les utilisateurs peuvent créer des associations dans leurs mondes
CREATE POLICY "Users can create client associations in their worlds"
ON client_world_associations FOR INSERT
WITH CHECK (has_world_access(auth.uid(), world_id));

-- Politique: les utilisateurs peuvent supprimer les associations dans leurs mondes
CREATE POLICY "Users can delete client associations in their worlds"
ON client_world_associations FOR DELETE
USING (has_world_access(auth.uid(), world_id));