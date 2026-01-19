-- Complete DBCS Workflow Template
-- 25 steps with decisions, loops, and automatic actions

-- First, delete the old simplified workflow
DELETE FROM dossier_workflow_progress WHERE dossier_id IN (
  SELECT d.id FROM dossiers d 
  JOIN workflow_templates wt ON d.world_id = wt.world_id 
  WHERE wt.name = 'Workflow DBCS - Archivage'
);
DELETE FROM workflow_steps WHERE workflow_template_id IN (
  SELECT id FROM workflow_templates WHERE name = 'Workflow DBCS - Archivage'
);
DELETE FROM workflow_templates WHERE name = 'Workflow DBCS - Archivage';

-- Create the complete workflow template
INSERT INTO workflow_templates (id, name, description, world_id, version, is_active)
SELECT 
  gen_random_uuid(),
  'Workflow DBCS - Gestion Chantier Complet',
  'Workflow complet de gestion de chantier DBCS avec 25 étapes, décisions et boucles',
  w.id,
  1,
  true
FROM worlds w
WHERE w.code = 'DBCS';

-- Store the template ID for reference
DO $$
DECLARE
  template_id uuid;
  world_id_val uuid;
  
  -- Step IDs
  step1_id uuid := gen_random_uuid();
  step2_id uuid := gen_random_uuid();
  step3_id uuid := gen_random_uuid();
  step4_id uuid := gen_random_uuid();
  step5_id uuid := gen_random_uuid();
  step6_id uuid := gen_random_uuid();
  step7_id uuid := gen_random_uuid();
  step8_id uuid := gen_random_uuid();
  step9_id uuid := gen_random_uuid();
  step10_id uuid := gen_random_uuid();
  step11_id uuid := gen_random_uuid();
  step12_id uuid := gen_random_uuid();
  step13_id uuid := gen_random_uuid();
  step14_id uuid := gen_random_uuid();
  step15_id uuid := gen_random_uuid();
  step16_id uuid := gen_random_uuid();
  step17_id uuid := gen_random_uuid();
  step18_id uuid := gen_random_uuid();
  step19_id uuid := gen_random_uuid();
  step20_id uuid := gen_random_uuid();
  step21_id uuid := gen_random_uuid();
  step22_id uuid := gen_random_uuid();
  step23_id uuid := gen_random_uuid();
  step24_id uuid := gen_random_uuid();
  step25_id uuid := gen_random_uuid();
BEGIN
  -- Get template and world IDs
  SELECT id INTO template_id FROM workflow_templates 
  WHERE name = 'Workflow DBCS - Gestion Chantier Complet';
  
  SELECT id INTO world_id_val FROM worlds WHERE code = 'DBCS';

  -- GROUPE 1: INITIALISATION (Steps 1-4)
  
  -- Step 1: Création Client
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description, 
    step_type, is_required, next_step_id,
    form_fields, estimated_duration
  ) VALUES (
    step1_id, template_id, 1, 
    'Création Client',
    'Saisie des informations du client',
    'data_entry', true, step2_id,
    '[
      {"name": "nom", "label": "Nom", "type": "text", "required": true},
      {"name": "prenom", "label": "Prénom", "type": "text", "required": true},
      {"name": "email", "label": "Email", "type": "text", "required": true},
      {"name": "telephone", "label": "Téléphone", "type": "text", "required": true},
      {"name": "adresse", "label": "Adresse du sinistre", "type": "textarea", "required": true},
      {"name": "type_sinistre", "label": "Type de sinistre", "type": "select", "options": ["Incendie", "Dégât des eaux", "Tempête", "Autre"], "required": true}
    ]'::jsonb,
    '1 hour'::interval
  );

  -- Step 2: Création EDP/Devis
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration
  ) VALUES (
    step2_id, template_id, 2,
    'Création EDP/Devis',
    'Création de l''état des lieux et du devis',
    'document_generation', true, step3_id,
    '[
      {"name": "montant_devis", "label": "Montant du devis (€)", "type": "number", "required": true},
      {"name": "description_travaux", "label": "Description des travaux", "type": "textarea", "required": true},
      {"name": "envoyer_client", "label": "Envoyer au client", "type": "boolean", "required": false}
    ]'::jsonb,
    '2 hours'::interval
  );

  -- Step 3: Rendez-vous Technique
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration
  ) VALUES (
    step3_id, template_id, 3,
    'Rendez-vous Technique',
    'Visite technique sur site avec le client',
    'appointment', true, step4_id,
    '[
      {"name": "date_rdv", "label": "Date du RDV", "type": "date", "required": true},
      {"name": "heure_rdv", "label": "Heure du RDV", "type": "text", "required": true},
      {"name": "statut_devis", "label": "Statut du devis", "type": "select", "options": ["Accepté", "Refusé", "En attente"], "required": true},
      {"name": "montant_acompte", "label": "Montant acompte (€)", "type": "number", "required": false}
    ]'::jsonb,
    '3 hours'::interval
  );

  -- Step 4: Protocole d'Accord (optional)
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, is_optional, next_step_id,
    form_fields, estimated_duration
  ) VALUES (
    step4_id, template_id, 4,
    'Protocole d''Accord',
    'Signature du protocole d''accord (optionnel)',
    'approval', true, true, step5_id,
    '[
      {"name": "protocole_signe", "label": "Protocole signé", "type": "boolean", "required": false},
      {"name": "document_protocole", "label": "Document protocole", "type": "file", "required": false}
    ]'::jsonb,
    '1 hour'::interval
  );

  -- GROUPE 2: DÉMARCHES ADMINISTRATIVES (Steps 5-10)

  -- Step 5: Demande Occupation du Sol
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration,
    auto_actions
  ) VALUES (
    step5_id, template_id, 5,
    'Demande Occupation du Sol',
    'Demande d''autorisation d''occupation du sol auprès de la mairie',
    'external_form', true, step6_id,
    '[
      {"name": "date_demande", "label": "Date de la demande", "type": "date", "required": true},
      {"name": "mairie", "label": "Mairie concernée", "type": "text", "required": true},
      {"name": "surface_occupation", "label": "Surface d''occupation (m²)", "type": "number", "required": true}
    ]'::jsonb,
    '1 hour'::interval,
    '[
      {"type": "create_notification", "title": "Demande occupation du sol envoyée", "message": "La demande a été transmise à la mairie"}
    ]'::jsonb
  );

  -- Step 6: Génération Demande + Suivi
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration
  ) VALUES (
    step6_id, template_id, 6,
    'Génération Demande + Suivi',
    'Génération automatique du document de demande et suivi',
    'document_generation', true, step7_id,
    '[
      {"name": "numero_demande", "label": "Numéro de demande", "type": "text", "required": true},
      {"name": "statut_suivi", "label": "Statut du suivi", "type": "select", "options": ["En attente", "En cours", "Accordé", "Refusé"], "required": true}
    ]'::jsonb,
    '30 minutes'::interval
  );

  -- Step 7: DECISION - Arrêté obtenu ?
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, requires_decision,
    decision_yes_next_step_id, decision_no_next_step_id,
    form_fields, estimated_duration
  ) VALUES (
    step7_id, template_id, 7,
    'DÉCISION: Arrêté obtenu ?',
    'Vérifier si l''arrêté d''occupation a été obtenu',
    'decision', true, true,
    step8_id, step6_id, -- Si Non, retour à l'étape 6 (boucle)
    '[
      {"name": "arrete_obtenu", "label": "Arrêté obtenu", "type": "boolean", "required": true},
      {"name": "numero_arrete", "label": "Numéro d''arrêté", "type": "text", "required": false},
      {"name": "date_obtention", "label": "Date d''obtention", "type": "date", "required": false}
    ]'::jsonb,
    '5 minutes'::interval
  );

  -- Step 8: Enregistrement Arrêté
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration,
    auto_actions
  ) VALUES (
    step8_id, template_id, 8,
    'Enregistrement Arrêté',
    'Enregistrement de l''arrêté dans le système',
    'data_entry', true, step9_id,
    '[
      {"name": "date_debut", "label": "Date de début", "type": "date", "required": true},
      {"name": "date_fin", "label": "Date de fin", "type": "date", "required": true},
      {"name": "document_arrete", "label": "Document arrêté", "type": "file", "required": true}
    ]'::jsonb,
    '15 minutes'::interval,
    '[
      {"type": "create_notification", "title": "Arrêté enregistré", "message": "L''arrêté a été enregistré avec succès"}
    ]'::jsonb
  );

  -- Step 9: DECISION - Travaux finis ?
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, requires_decision,
    decision_yes_next_step_id, decision_no_next_step_id,
    form_fields, estimated_duration, can_loop_back
  ) VALUES (
    step9_id, template_id, 9,
    'DÉCISION: Travaux finis ?',
    'Vérifier si les travaux sont terminés avant expiration',
    'decision', true, true,
    step11_id, step10_id, -- Si Non, demande de prolongation
    '[
      {"name": "travaux_finis", "label": "Travaux terminés", "type": "boolean", "required": true},
      {"name": "date_fin_reelle", "label": "Date de fin réelle", "type": "date", "required": false}
    ]'::jsonb,
    '5 minutes'::interval,
    true
  );

  -- Step 10: Demande de Prolongation
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration,
    auto_actions
  ) VALUES (
    step10_id, template_id, 10,
    'Demande de Prolongation',
    'Demande de prolongation de l''arrêté',
    'external_form', true, step9_id, -- Retour à la décision
    '[
      {"name": "duree_prolongation", "label": "Durée de prolongation (jours)", "type": "number", "required": true},
      {"name": "motif", "label": "Motif de la prolongation", "type": "textarea", "required": true}
    ]'::jsonb,
    '1 hour'::interval,
    '[
      {"type": "send_email", "recipient": "mairie", "subject": "Demande de prolongation", "template": "prolongation"}
    ]'::jsonb
  );

  -- GROUPE 3: PRÉPARATION CHANTIER (Steps 11-15)

  -- Step 11: Demande de Compteur
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration
  ) VALUES (
    step11_id, template_id, 11,
    'Demande de Compteur',
    'Demande de compteur électrique provisoire',
    'external_form', true, step12_id,
    '[
      {"name": "type_compteur", "label": "Type de compteur", "type": "select", "options": ["Monophasé", "Triphasé"], "required": true},
      {"name": "puissance", "label": "Puissance (kVA)", "type": "number", "required": true},
      {"name": "fournisseur", "label": "Fournisseur", "type": "text", "required": true}
    ]'::jsonb,
    '30 minutes'::interval
  );

  -- Step 12: DECISION - Date RDV Compteur ?
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, requires_decision,
    decision_yes_next_step_id, decision_no_next_step_id,
    form_fields, estimated_duration, can_loop_back
  ) VALUES (
    step12_id, template_id, 12,
    'DÉCISION: Date RDV Compteur ?',
    'Vérifier si une date de RDV a été fixée',
    'decision', true, true,
    step13_id, step11_id, -- Si Non, retour à demande compteur
    '[
      {"name": "date_rdv_fixee", "label": "Date RDV fixée", "type": "boolean", "required": true},
      {"name": "date_rdv", "label": "Date du RDV", "type": "date", "required": false},
      {"name": "heure_rdv", "label": "Heure du RDV", "type": "text", "required": false}
    ]'::jsonb,
    '5 minutes'::interval,
    true
  );

  -- Step 13: Création Tâche Chef Équipe
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration,
    auto_actions
  ) VALUES (
    step13_id, template_id, 13,
    'Création Tâche Chef Équipe',
    'Création automatique de la tâche pour le chef d''équipe',
    'task_creation', true, step14_id,
    '[
      {"name": "chef_equipe", "label": "Chef d''équipe assigné", "type": "text", "required": true},
      {"name": "date_debut_prevue", "label": "Date de début prévue", "type": "date", "required": true}
    ]'::jsonb,
    '10 minutes'::interval,
    '[
      {"type": "create_task", "assignedTo": "chef_equipe", "title": "Préparer l''intervention", "priority": "high"}
    ]'::jsonb
  );

  -- Step 14: Tâches Logistiques
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration
  ) VALUES (
    step14_id, template_id, 14,
    'Tâches Logistiques',
    'Préparation logistique (matériel, équipement, transport)',
    'checklist', true, step15_id,
    '[
      {"name": "materiel_prepare", "label": "Matériel préparé", "type": "boolean", "required": true},
      {"name": "transport_organise", "label": "Transport organisé", "type": "boolean", "required": true},
      {"name": "equipement_securite", "label": "Équipement de sécurité", "type": "boolean", "required": true},
      {"name": "liste_materiel", "label": "Liste du matériel", "type": "textarea", "required": false}
    ]'::jsonb,
    '2 hours'::interval
  );

  -- Step 15: Démarrage Chantier
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration,
    auto_actions
  ) VALUES (
    step15_id, template_id, 15,
    'Démarrage Chantier',
    'Démarrage officiel du chantier',
    'milestone', true, step16_id,
    '[
      {"name": "date_demarrage", "label": "Date de démarrage", "type": "date", "required": true},
      {"name": "equipe_presente", "label": "Équipe présente", "type": "text", "required": true},
      {"name": "photo_debut", "label": "Photo de début", "type": "file", "required": false}
    ]'::jsonb,
    '30 minutes'::interval,
    '[
      {"type": "create_notification", "title": "Chantier démarré", "message": "Le chantier a officiellement démarré"},
      {"type": "send_email", "recipient": "client", "subject": "Démarrage des travaux", "template": "demarrage_chantier"}
    ]'::jsonb
  );

  -- GROUPE 4: EXÉCUTION CHANTIER (Steps 16-19)

  -- Step 16: Suivi Chantier
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration,
    auto_actions
  ) VALUES (
    step16_id, template_id, 16,
    'Suivi Chantier',
    'Suivi quotidien de l''avancement du chantier',
    'review', true, step17_id,
    '[
      {"name": "avancement_pct", "label": "Avancement (%)", "type": "number", "required": true},
      {"name": "problemes_rencontres", "label": "Problèmes rencontrés", "type": "textarea", "required": false},
      {"name": "photos_avancement", "label": "Photos avancement", "type": "file", "required": false},
      {"name": "date_fin_prevue", "label": "Date de fin prévue", "type": "date", "required": true}
    ]'::jsonb,
    '7 days'::interval,
    '[
      {"type": "create_notification", "title": "Rappel suivi chantier", "message": "Mettre à jour le suivi du chantier", "schedule": "daily"}
    ]'::jsonb
  );

  -- Step 17: Demande Consuel
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration
  ) VALUES (
    step17_id, template_id, 17,
    'Demande Consuel',
    'Demande d''attestation Consuel',
    'external_form', true, step18_id,
    '[
      {"name": "type_installation", "label": "Type d''installation", "type": "select", "options": ["Neuf", "Rénovation"], "required": true},
      {"name": "numero_demande_consuel", "label": "Numéro de demande", "type": "text", "required": true},
      {"name": "date_demande", "label": "Date de la demande", "type": "date", "required": true}
    ]'::jsonb,
    '1 hour'::interval
  );

  -- Step 18: DECISION - Attestation reçue ?
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, requires_decision,
    decision_yes_next_step_id, decision_no_next_step_id,
    form_fields, estimated_duration, can_loop_back
  ) VALUES (
    step18_id, template_id, 18,
    'DÉCISION: Attestation reçue ?',
    'Vérifier si l''attestation Consuel a été reçue',
    'decision', true, true,
    step19_id, step17_id, -- Si Non, retour à demande Consuel
    '[
      {"name": "attestation_recue", "label": "Attestation reçue", "type": "boolean", "required": true},
      {"name": "numero_attestation", "label": "Numéro d''attestation", "type": "text", "required": false},
      {"name": "document_consuel", "label": "Document Consuel", "type": "file", "required": false}
    ]'::jsonb,
    '5 minutes'::interval,
    true
  );

  -- Step 19: Envoi Auto Client
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration,
    auto_actions
  ) VALUES (
    step19_id, template_id, 19,
    'Envoi Auto Client',
    'Envoi automatique de l''attestation Consuel au client',
    'notification', true, step20_id,
    '[
      {"name": "email_envoye", "label": "Email envoyé", "type": "boolean", "required": false},
      {"name": "date_envoi", "label": "Date d''envoi", "type": "date", "required": false}
    ]'::jsonb,
    '5 minutes'::interval,
    '[
      {"type": "send_email", "recipient": "client", "subject": "Attestation Consuel", "template": "consuel", "attachments": ["consuel_document"]}
    ]'::jsonb
  );

  -- GROUPE 5: FINALISATION (Steps 20-25)

  -- Step 20: DECISION - JDMO existe ?
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, requires_decision,
    decision_yes_next_step_id, decision_no_next_step_id,
    form_fields, estimated_duration,
    metadata
  ) VALUES (
    step20_id, template_id, 20,
    'DÉCISION: JDMO existe ?',
    'Vérifier si un dossier JDMO (Mise en œuvre) existe pour ce client',
    'decision', true, true,
    step21_id, step21_id, -- Les deux vont à 21, mais metadata indique la possibilité de transfert
    '[
      {"name": "jdmo_existe", "label": "Dossier JDMO existe", "type": "boolean", "required": true},
      {"name": "numero_jdmo", "label": "Numéro JDMO", "type": "text", "required": false},
      {"name": "transferer_vers_jdmo", "label": "Transférer vers JDMO", "type": "boolean", "required": false}
    ]'::jsonb,
    '10 minutes'::interval,
    '{"allows_transfer": true, "target_world": "JDMO"}'::jsonb
  );

  -- Step 21: Système Dossier Diffusé
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration
  ) VALUES (
    step21_id, template_id, 21,
    'Système Dossier Diffusé',
    'Agrégation et diffusion de tous les documents du dossier',
    'document_generation', true, step22_id,
    '[
      {"name": "documents_agreges", "label": "Documents agrégés", "type": "boolean", "required": true},
      {"name": "dossier_pdf_genere", "label": "PDF du dossier généré", "type": "boolean", "required": true}
    ]'::jsonb,
    '30 minutes'::interval
  );

  -- Step 22: Contrôle Documents Obligatoires
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration,
    metadata
  ) VALUES (
    step22_id, template_id, 22,
    'Contrôle Documents Obligatoires',
    'Vérification de la présence de tous les documents obligatoires',
    'quality_control', true, step23_id,
    '[
      {"name": "controle_effectue", "label": "Contrôle effectué", "type": "boolean", "required": true},
      {"name": "documents_manquants", "label": "Documents manquants", "type": "textarea", "required": false}
    ]'::jsonb,
    '20 minutes'::interval,
    '{"required_documents": ["EDP", "Devis", "Arrêté", "Consuel", "Photos début/fin", "Facture"]}'::jsonb
  );

  -- Step 23: DECISION - Documents manquants ?
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, requires_decision,
    decision_yes_next_step_id, decision_no_next_step_id,
    form_fields, estimated_duration, can_loop_back,
    auto_actions
  ) VALUES (
    step23_id, template_id, 23,
    'DÉCISION: Documents manquants ?',
    'Vérifier s''il manque des documents obligatoires',
    'decision', true, true,
    step22_id, step24_id, -- Si Oui (manquants), retour à 22, sinon continue
    '[
      {"name": "documents_complets", "label": "Tous les documents sont présents", "type": "boolean", "required": true},
      {"name": "liste_manquants", "label": "Liste des documents manquants", "type": "textarea", "required": false}
    ]'::jsonb,
    '5 minutes'::interval,
    true,
    '[
      {"type": "create_notification", "title": "Documents manquants", "message": "Certains documents obligatoires sont manquants", "condition": "documents_missing"}
    ]'::jsonb
  );

  -- Step 24: Archivage Final
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, next_step_id,
    form_fields, estimated_duration,
    auto_actions
  ) VALUES (
    step24_id, template_id, 24,
    'Archivage Final',
    'Archivage du dossier complet',
    'archiving', true, step25_id,
    '[
      {"name": "archive_complete", "label": "Archivage terminé", "type": "boolean", "required": true},
      {"name": "emplacement_archive", "label": "Emplacement archive", "type": "text", "required": false},
      {"name": "date_archivage", "label": "Date d''archivage", "type": "date", "required": true}
    ]'::jsonb,
    '15 minutes'::interval,
    '[
      {"type": "create_notification", "title": "Dossier archivé", "message": "Le dossier a été archivé avec succès"}
    ]'::jsonb
  );

  -- Step 25: SAV (Service Après-Vente)
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, is_required, is_optional,
    form_fields, estimated_duration
  ) VALUES (
    step25_id, template_id, 25,
    'SAV - Service Après-Vente',
    'Gestion des interventions SAV (optionnel)',
    'task_creation', true, true,
    '[
      {"name": "intervention_sav", "label": "Intervention SAV nécessaire", "type": "boolean", "required": false},
      {"name": "type_intervention", "label": "Type d''intervention", "type": "select", "options": ["Garantie", "Réparation", "Maintenance"], "required": false},
      {"name": "description_probleme", "label": "Description du problème", "type": "textarea", "required": false},
      {"name": "date_intervention", "label": "Date intervention", "type": "date", "required": false}
    ]'::jsonb,
    '1 hour'::interval
  );

END $$;

-- Update existing DBCS dossiers to use the new workflow
-- This will initialize the workflow progress for existing dossiers
INSERT INTO dossier_workflow_progress (dossier_id, workflow_step_id, status, started_at)
SELECT 
  d.id as dossier_id,
  ws.id as workflow_step_id,
  CASE 
    WHEN ws.step_number = 1 THEN 'in_progress'::workflow_progress_status
    ELSE 'pending'::workflow_progress_status
  END as status,
  CASE 
    WHEN ws.step_number = 1 THEN NOW()
    ELSE NULL
  END as started_at
FROM dossiers d
JOIN worlds w ON d.world_id = w.id
JOIN workflow_templates wt ON wt.world_id = w.id AND wt.name = 'Workflow DBCS - Gestion Chantier Complet'
JOIN workflow_steps ws ON ws.workflow_template_id = wt.id
WHERE w.code = 'DBCS'
  AND NOT EXISTS (
    SELECT 1 FROM dossier_workflow_progress dwp 
    WHERE dwp.dossier_id = d.id
  );
