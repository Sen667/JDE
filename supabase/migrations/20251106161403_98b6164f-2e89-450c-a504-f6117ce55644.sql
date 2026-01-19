-- Ajouter plus de données de test pour améliorer la visualisation

DO $$
DECLARE
  jde_world_id uuid := 'dadfb2f2-f8a7-482f-9e79-706703836a88';
  jdmo_world_id uuid := 'b3c336fb-8031-4750-9e04-3eca3656ba49';
  dbcs_world_id uuid := '161506e6-8c9b-47fe-95fa-c7c7d4796f6b';
  current_user_id uuid;
BEGIN
  SELECT id INTO current_user_id FROM profiles LIMIT 1;
  
  -- Ajouter plus de dossiers variés
  INSERT INTO dossiers (title, status, world_id, owner_id, tags, created_at)
  VALUES 
    ('Mise à jour sécurité Q1', 'nouveau', jde_world_id, current_user_id, ARRAY['sécurité', 'urgent'], NOW() - INTERVAL '1 day'),
    ('Optimisation base données', 'en_cours', dbcs_world_id, current_user_id, ARRAY['performance', 'db'], NOW() - INTERVAL '3 days'),
    ('Tests automatisés', 'en_cours', jde_world_id, current_user_id, ARRAY['tests', 'qualité'], NOW() - INTERVAL '5 days'),
    ('Documentation API', 'cloture', jdmo_world_id, current_user_id, ARRAY['documentation', 'api'], NOW() - INTERVAL '10 days'),
    ('Monitoring production', 'en_cours', dbcs_world_id, current_user_id, ARRAY['monitoring', 'production'], NOW() - INTERVAL '2 days'),
    ('Interface admin v2', 'nouveau', jde_world_id, current_user_id, ARRAY['admin', 'ui'], NOW()),
    ('Intégration paiements', 'en_cours', jdmo_world_id, current_user_id, ARRAY['paiement', 'stripe'], NOW() - INTERVAL '4 days'),
    ('Backup automatique', 'cloture', dbcs_world_id, current_user_id, ARRAY['backup', 'automatisation'], NOW() - INTERVAL '15 days')
  ON CONFLICT DO NOTHING;

  -- Ajouter plus de tâches variées
  INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, world_id, due_date, created_at)
  VALUES 
    ('Implémenter MFA', 'Ajouter authentification multi-facteurs', 'todo', 'high', current_user_id, current_user_id, jde_world_id, NOW() + INTERVAL '5 days', NOW() - INTERVAL '1 day'),
    ('Optimiser requêtes SQL', 'Améliorer performances DB', 'in_progress', 'high', current_user_id, current_user_id, dbcs_world_id, NOW() + INTERVAL '3 days', NOW() - INTERVAL '2 days'),
    ('Tests end-to-end', 'Suite complète de tests E2E', 'in_progress', 'medium', current_user_id, current_user_id, jde_world_id, NOW() + INTERVAL '7 days', NOW() - INTERVAL '3 days'),
    ('Guide API REST', 'Documentation complète API', 'done', 'low', current_user_id, current_user_id, jdmo_world_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '12 days'),
    ('Dashboard métriques', 'Tableau de bord monitoring', 'in_progress', 'medium', current_user_id, current_user_id, dbcs_world_id, NOW() + INTERVAL '6 days', NOW() - INTERVAL '1 day'),
    ('Révision UX', 'Améliorer expérience utilisateur', 'todo', 'medium', current_user_id, current_user_id, jde_world_id, NOW() + INTERVAL '10 days', NOW()),
    ('Gateway paiement', 'Configurer Stripe Connect', 'in_progress', 'high', current_user_id, current_user_id, jdmo_world_id, NOW() + INTERVAL '4 days', NOW() - INTERVAL '4 days'),
    ('Scripts sauvegarde', 'Automatiser backups DB', 'done', 'medium', current_user_id, current_user_id, dbcs_world_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '20 days')
  ON CONFLICT DO NOTHING;

  -- Ajouter plus de rendez-vous
  INSERT INTO appointments (title, description, start_time, end_time, status, user_id, world_id, created_at)
  VALUES 
    ('Stand-up quotidien', 'Point rapide équipe JDE', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '1 hour 15 minutes', 'scheduled', current_user_id, jde_world_id, NOW()),
    ('Revue sprint', 'Bilan sprint en cours', NOW() + INTERVAL '5 hours', NOW() + INTERVAL '6 hours', 'scheduled', current_user_id, jde_world_id, NOW()),
    ('Formation Stripe', 'Session formation paiements', NOW() + INTERVAL '1 day' + INTERVAL '3 hours', NOW() + INTERVAL '1 day' + INTERVAL '5 hours', 'scheduled', current_user_id, jdmo_world_id, NOW()),
    ('Audit performance', 'Analyse perf base de données', NOW() + INTERVAL '2 days' + INTERVAL '2 hours', NOW() + INTERVAL '2 days' + INTERVAL '4 hours', 'scheduled', current_user_id, dbcs_world_id, NOW()),
    ('Demo stakeholders', 'Présentation nouvelles features', NOW() + INTERVAL '3 days' + INTERVAL '4 hours', NOW() + INTERVAL '3 days' + INTERVAL '5 hours', 'scheduled', current_user_id, jde_world_id, NOW()),
    ('Retro sprint', 'Rétrospective équipe', NOW() + INTERVAL '4 days' + INTERVAL '3 hours', NOW() + INTERVAL '4 days' + INTERVAL '4 hours', 'scheduled', current_user_id, jde_world_id, NOW())
  ON CONFLICT DO NOTHING;

END $$;