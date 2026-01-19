-- Add reference column to dossiers table
ALTER TABLE dossiers ADD COLUMN reference TEXT UNIQUE;

-- Create a function to generate the next reference number for a dossier
CREATE OR REPLACE FUNCTION generate_dossier_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  reference_number TEXT;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Get the highest number for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN reference LIKE current_year || '-%' 
      THEN CAST(SUBSTRING(reference FROM '[0-9]+$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM dossiers;
  
  -- Format the reference as YYYY-NNN (with leading zeros)
  reference_number := current_year || '-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN reference_number;
END;
$$;

-- Create a trigger to auto-generate reference on insert
CREATE OR REPLACE FUNCTION set_dossier_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference := generate_dossier_reference();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_dossier_reference
BEFORE INSERT ON dossiers
FOR EACH ROW
EXECUTE FUNCTION set_dossier_reference();