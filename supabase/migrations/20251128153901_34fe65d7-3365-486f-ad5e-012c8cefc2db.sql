-- Add landlord information columns for tenants (locataires)
ALTER TABLE dossier_client_info
ADD COLUMN proprietaire_nom TEXT,
ADD COLUMN proprietaire_prenom TEXT,
ADD COLUMN proprietaire_telephone TEXT,
ADD COLUMN proprietaire_email TEXT,
ADD COLUMN proprietaire_adresse TEXT;