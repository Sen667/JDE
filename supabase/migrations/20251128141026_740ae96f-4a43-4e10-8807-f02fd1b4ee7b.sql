-- Add workflow_step_id column to dossier_comments for explicit step association
ALTER TABLE dossier_comments 
ADD COLUMN workflow_step_id uuid REFERENCES workflow_steps(id);

-- Add index for better query performance
CREATE INDEX idx_dossier_comments_workflow_step_id ON dossier_comments(workflow_step_id);