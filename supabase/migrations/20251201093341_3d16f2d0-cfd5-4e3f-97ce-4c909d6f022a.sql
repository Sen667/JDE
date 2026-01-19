-- Add client_info_id column to dossiers table to reference client file directly
ALTER TABLE dossiers
ADD COLUMN client_info_id UUID REFERENCES dossier_client_info(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_dossiers_client_info_id ON dossiers(client_info_id);