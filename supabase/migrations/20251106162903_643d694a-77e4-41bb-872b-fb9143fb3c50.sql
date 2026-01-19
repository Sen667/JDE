-- Créer des tâches de test pour l'utilisateur actuel
INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, world_id, due_date, created_at)
VALUES 
  -- Tâches urgentes pour aujourd'hui
  ('Validation dossier JDE-2024-015', 'Vérifier et valider avant 18h', 'in_progress', 'high', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'dadfb2f2-f8a7-482f-9e79-706703836a88', '2025-11-06 18:00:00+00', '2025-11-05 09:00:00+00'),
  ('Réponse client JDMO urgent', 'Email à envoyer immédiatement', 'todo', 'high', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'b3c336fb-8031-4750-9e04-3eca3656ba49', '2025-11-06 17:00:00+00', '2025-11-06 08:00:00+00'),
  
  -- Tâches cette semaine
  ('Préparer rapport DBCS mensuel', 'Statistiques et analyse du mois', 'todo', 'medium', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', '161506e6-8c9b-47fe-95fa-c7c7d4796f6b', '2025-11-08 12:00:00+00', '2025-11-04 10:00:00+00'),
  ('Mise à jour base JDE', 'Import nouveaux dossiers', 'in_progress', 'medium', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'dadfb2f2-f8a7-482f-9e79-706703836a88', '2025-11-09 15:00:00+00', '2025-11-03 14:00:00+00'),
  ('Formation équipe JDMO', 'Nouvelles procédures', 'todo', 'low', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'b3c336fb-8031-4750-9e04-3eca3656ba49', '2025-11-10 10:00:00+00', '2025-11-02 11:00:00+00'),
  
  -- Tâches terminées
  ('Audit sécurité DBCS', 'Contrôle trimestriel effectué', 'done', 'high', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', '161506e6-8c9b-47fe-95fa-c7c7d4796f6b', '2025-11-05 16:00:00+00', '2025-10-28 09:00:00+00'),
  ('Archivage dossiers JDE octobre', 'Dossiers clos archivés', 'done', 'medium', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'dadfb2f2-f8a7-482f-9e79-706703836a88', '2025-11-01 14:00:00+00', '2025-10-25 10:00:00+00');

-- Créer des rendez-vous de test pour aujourd'hui et cette semaine
INSERT INTO appointments (title, description, start_time, end_time, status, user_id, world_id, created_at)
VALUES 
  -- Aujourd'hui
  ('Réunion équipe JDE', 'Point hebdomadaire', '2025-11-06 09:30:00+00', '2025-11-06 10:30:00+00', 'scheduled', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'dadfb2f2-f8a7-482f-9e79-706703836a88', '2025-11-05 14:00:00+00'),
  ('Call client JDMO', 'Suivi dossier urgent', '2025-11-06 14:00:00+00', '2025-11-06 15:00:00+00', 'scheduled', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'b3c336fb-8031-4750-9e04-3eca3656ba49', '2025-11-06 08:30:00+00'),
  ('Présentation DBCS', 'Résultats mensuels', '2025-11-06 16:00:00+00', '2025-11-06 17:30:00+00', 'scheduled', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', '161506e6-8c9b-47fe-95fa-c7c7d4796f6b', '2025-11-04 16:00:00+00'),
  
  -- Cette semaine
  ('Formation JDE', 'Nouveaux processus', '2025-11-07 10:00:00+00', '2025-11-07 12:00:00+00', 'scheduled', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'dadfb2f2-f8a7-482f-9e79-706703836a88', '2025-11-03 09:00:00+00'),
  ('Revue JDMO', 'Analyse trimestrielle', '2025-11-08 14:00:00+00', '2025-11-08 16:00:00+00', 'scheduled', 'b858bc0e-4c2f-4389-b690-3a5f2f160455', 'b3c336fb-8031-4750-9e04-3eca3656ba49', '2025-11-02 11:00:00+00');