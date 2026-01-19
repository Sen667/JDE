-- Rendre la colonne end_time nullable dans la table appointments
ALTER TABLE appointments ALTER COLUMN end_time DROP NOT NULL;