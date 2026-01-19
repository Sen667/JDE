-- Add attachment_id column to link admin documents to uploaded files
ALTER TABLE dossier_admin_documents
ADD COLUMN attachment_id UUID REFERENCES dossier_attachments(id) ON DELETE SET NULL;