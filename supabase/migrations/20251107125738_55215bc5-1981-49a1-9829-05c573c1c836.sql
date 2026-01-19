-- Sprint 1: Refonte du système de workflow pour processus métier avec branches conditionnelles

-- 1. Ajouter les nouveaux champs à workflow_steps pour supporter les branches et la complexité
ALTER TABLE workflow_steps
  ADD COLUMN next_step_id uuid REFERENCES workflow_steps(id),
  ADD COLUMN decision_yes_next_step_id uuid REFERENCES workflow_steps(id),
  ADD COLUMN decision_no_next_step_id uuid REFERENCES workflow_steps(id),
  ADD COLUMN parallel_steps jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN can_loop_back boolean DEFAULT false,
  ADD COLUMN is_optional boolean DEFAULT false,
  ADD COLUMN auto_actions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN conditions jsonb DEFAULT '{}'::jsonb;

-- Améliorer le commentaire des champs metadata pour clarifier l'usage
COMMENT ON COLUMN workflow_steps.auto_actions IS 'Actions automatiques: génération documents, envoi emails, intégrations externes';
COMMENT ON COLUMN workflow_steps.conditions IS 'Conditions d''activation de l''étape basées sur les données du dossier';
COMMENT ON COLUMN workflow_steps.parallel_steps IS 'Array d''IDs d''étapes qui peuvent être exécutées en parallèle';

-- 2. Créer la table pour l'historique détaillé du workflow (traçabilité des décisions)
CREATE TABLE dossier_workflow_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  workflow_step_id uuid NOT NULL REFERENCES workflow_steps(id),
  previous_step_id uuid REFERENCES workflow_steps(id),
  next_step_id uuid REFERENCES workflow_steps(id),
  decision_taken text,
  decision_reason text,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance sur l'historique
CREATE INDEX idx_workflow_history_dossier ON dossier_workflow_history(dossier_id);
CREATE INDEX idx_workflow_history_step ON dossier_workflow_history(workflow_step_id);
CREATE INDEX idx_workflow_history_created ON dossier_workflow_history(created_at DESC);

-- 3. Créer la table pour les templates de documents
CREATE TABLE document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_step_id uuid NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  name text NOT NULL,
  document_type text NOT NULL,
  template_content jsonb NOT NULL,
  required_fields jsonb DEFAULT '[]'::jsonb,
  auto_generate boolean DEFAULT false,
  needs_signature boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index sur document_templates
CREATE INDEX idx_document_templates_step ON document_templates(workflow_step_id);

-- 4. Améliorer dossier_workflow_progress avec plus de métadonnées
ALTER TABLE dossier_workflow_progress
  ADD COLUMN form_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN assigned_to uuid REFERENCES auth.users(id),
  ADD COLUMN due_date timestamptz,
  ADD COLUMN started_at timestamptz,
  ADD COLUMN blocked boolean DEFAULT false,
  ADD COLUMN blocking_reason text;

-- 5. RLS Policies pour les nouvelles tables

-- Policies pour dossier_workflow_history
ALTER TABLE dossier_workflow_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow history for accessible dossiers"
ON dossier_workflow_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM dossiers d
    WHERE d.id = dossier_workflow_history.dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
);

CREATE POLICY "Users can create workflow history for accessible dossiers"
ON dossier_workflow_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM dossiers d
    WHERE d.id = dossier_workflow_history.dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
  AND user_id = auth.uid()
);

-- Policies pour document_templates
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document templates for their worlds"
ON document_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workflow_steps ws
    JOIN workflow_templates wt ON wt.id = ws.workflow_template_id
    WHERE ws.id = document_templates.workflow_step_id
    AND has_world_access(auth.uid(), wt.world_id)
  )
);

-- 6. Trigger pour updated_at sur document_templates
CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON document_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- 7. Fonction helper pour obtenir la prochaine étape basée sur une décision
CREATE OR REPLACE FUNCTION get_next_workflow_step(
  _step_id uuid,
  _decision boolean DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _decision IS NULL THEN next_step_id
    WHEN _decision = true THEN decision_yes_next_step_id
    WHEN _decision = false THEN decision_no_next_step_id
  END
  FROM workflow_steps
  WHERE id = _step_id
$$;