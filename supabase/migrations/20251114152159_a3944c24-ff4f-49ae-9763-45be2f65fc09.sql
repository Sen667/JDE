-- Correction du nom du monde JDE : JD Expertise -> JD Expertises
UPDATE public.worlds 
SET name = 'JD Expertises'
WHERE code = 'JDE';