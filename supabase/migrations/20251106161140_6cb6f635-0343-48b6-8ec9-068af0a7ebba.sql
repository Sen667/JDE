-- Créer des données de test minimales en utilisant l'utilisateur existant

-- Récupérer les IDs
DO $$
DECLARE
  jde_world_id uuid := 'dadfb2f2-f8a7-482f-9e79-706703836a88';
  jdmo_world_id uuid := 'b3c336fb-8031-4750-9e04-3eca3656ba49';
  dbcs_world_id uuid := '161506e6-8c9b-47fe-95fa-c7c7d4796f6b';
  current_user_id uuid;
BEGIN
  -- Récupérer l'ID du premier utilisateur
  SELECT id INTO current_user_id FROM profiles LIMIT 1;
  
  -- Créer quelques dossiers de test
  INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
  VALUES 
    ('Migration Cloud', 'en_cours', jde_world_id, current_user_id, ARRAY['infrastructure', 'cloud']),
    ('Refonte UI', 'nouveau', jde_world_id, current_user_id, ARRAY['ui', 'design']),
    ('App Mobile v2', 'en_cours', jdmo_world_id, current_user_id, ARRAY['mobile']),
    ('Migration DB', 'en_cours', dbcs_world_id, current_user_id, ARRAY['database'])
  ON CONFLICT DO NOTHING;

  -- Créer quelques tâches
  INSERT INTO public.tasks (title, description, status, priority, assigned_to, created_by, world_id, due_date)
  VALUES 
    ('Config serveurs', 'Mettre en place AWS', 'in_progress', 'high', current_user_id, current_user_id, jde_world_id, NOW() + INTERVAL '3 days'),
    ('Tests UI', 'Tester nouvelle interface', 'todo', 'medium', current_user_id, current_user_id, jde_world_id, NOW() + INTERVAL '7 days'),
    ('Build mobile', 'Compiler Android', 'in_progress', 'high', current_user_id, current_user_id, jdmo_world_id, NOW() + INTERVAL '1 day'),
    ('Script migration', 'Scripts SQL', 'in_progress', 'high', current_user_id, current_user_id, dbcs_world_id, NOW() + INTERVAL '2 days')
  ON CONFLICT DO NOTHING;

  -- Créer quelques rendez-vous
  INSERT INTO public.appointments (title, description, start_time, end_time, status, user_id, world_id)
  VALUES 
    ('Réunion équipe', 'Point hebdomadaire', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '3 hours', 'scheduled', current_user_id, jde_world_id),
    ('Demo client', 'Présentation v2', NOW() + INTERVAL '4 hours', NOW() + INTERVAL '5 hours', 'scheduled', current_user_id, jdmo_world_id),
    ('Sprint planning', 'Planification sprint', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', 'scheduled', current_user_id, jde_world_id)
  ON CONFLICT DO NOTHING;

END $$;
