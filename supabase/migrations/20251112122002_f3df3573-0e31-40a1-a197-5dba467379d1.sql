
-- Désactiver tous les workflows JDE sauf le plus récent
UPDATE workflow_templates
SET is_active = false
WHERE id IN (
  '37ca73f1-2ad3-4752-9ee4-4dddd98ac1f9',
  '41421943-a23f-4c08-8435-82fc5d6348a7',
  '10e2d1bb-daa3-4b58-8419-bacd4609cff0'
);

-- Garder uniquement le workflow JDE le plus récent actif
-- (a929ee2a-08ae-49ee-8c4c-05f6c9d6c4dd reste actif)

-- Vérification
DO $$
DECLARE
  active_jde_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_jde_count
  FROM workflow_templates wt
  JOIN worlds w ON w.id = wt.world_id
  WHERE w.code = 'JDE' AND wt.is_active = true;
  
  RAISE NOTICE 'Workflows JDE actifs après nettoyage: %', active_jde_count;
END $$;
