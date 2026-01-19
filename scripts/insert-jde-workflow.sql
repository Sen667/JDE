-- Script d'insertion du workflow JDE complet avec branches conditionnelles
-- Basé sur le processus métier réel de gestion de dossiers JDE

-- Note: Ce script doit être exécuté après avoir obtenu l'ID du monde JDE
-- Remplacez 'YOUR_WORLD_ID' par l'ID réel: dadfb2f2-f8a7-482f-9e79-706703836a88

DO $$
DECLARE
  v_world_id uuid := 'dadfb2f2-f8a7-482f-9e79-706703836a88';
  v_template_id uuid;
  v_step1_id uuid;
  v_step2_id uuid;
  v_step3_id uuid;
  v_step4_id uuid;
  v_step5a_id uuid;
  v_step5b_id uuid;
  v_step6_id uuid;
  v_step7_id uuid;
  v_step8_id uuid;
  v_step9_id uuid;
  v_step10_id uuid;
  v_step11_id uuid;
  v_step12_id uuid;
  v_step13_id uuid;
  v_step14_id uuid;
  v_step15_id uuid;
BEGIN
  -- 1. Créer le template de workflow JDE
  INSERT INTO workflow_templates (id, world_id, name, description, is_active, version)
  VALUES (
    gen_random_uuid(),
    v_world_id,
    'Processus JDE Standard',
    'Workflow complet pour la gestion des dossiers JDE avec branches conditionnelles',
    true,
    1
  )
  RETURNING id INTO v_template_id;

  -- 2. Créer les étapes du workflow avec leurs relations

  -- Étape 1: Réception et ouverture du dossier
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back,
    form_fields, metadata
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    1,
    'Réception du dossier',
    'Réception initiale et création du dossier dans le système',
    'action',
    false,
    false,
    false,
    '[
      {"name": "date_reception", "type": "date", "label": "Date de réception", "required": true},
      {"name": "origine", "type": "select", "label": "Origine du dossier", "options": ["Email", "Téléphone", "Courrier", "Plateforme"], "required": true}
    ]'::jsonb,
    '{
      "auto_actions": [
        {"type": "create_notification", "message": "Nouveau dossier reçu"}
      ]
    }'::jsonb
  )
  RETURNING id INTO v_step1_id;

  -- Étape 2: Analyse initiale du dossier
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back,
    form_fields
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    2,
    'Analyse initiale',
    'Vérification de la complétude du dossier et des informations reçues',
    'action',
    false,
    false,
    false,
    '[
      {"name": "complet", "type": "select", "label": "Dossier complet?", "options": ["Oui", "Non - Documents manquants", "Non - Informations manquantes"], "required": true},
      {"name": "priorite", "type": "select", "label": "Priorité", "options": ["Normale", "Urgente", "Très urgente"], "required": true}
    ]'::jsonb
  )
  RETURNING id INTO v_step2_id;

  -- Étape 3: Envoi Convention/Mandat
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back,
    form_fields, auto_actions
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    3,
    'Envoi Convention/Mandat',
    'Envoi de la convention ou du mandat au client pour signature',
    'document',
    false,
    false,
    false,
    '[
      {"name": "type_document", "type": "select", "label": "Type de document", "options": ["Convention", "Mandat"], "required": true},
      {"name": "mode_envoi", "type": "select", "label": "Mode d''envoi", "options": ["Email", "Courrier", "Plateforme signature électronique"], "required": true}
    ]'::jsonb,
    '[
      {"type": "generate_document", "documentType": "convention"},
      {"type": "send_email", "template": "convention_envoi"}
    ]'::jsonb
  )
  RETURNING id INTO v_step3_id;

  -- Étape 4: DÉCISION - Convention signée?
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    4,
    'Convention signée?',
    'Vérification de la réception de la convention signée',
    'decision',
    true,
    false,
    false
  )
  RETURNING id INTO v_step4_id;

  -- Étape 5a: Relance convention (si NON à étape 4)
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back,
    form_fields
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    5,
    'Relance convention',
    'Relance du client pour obtenir la convention signée',
    'action',
    false,
    false,
    true,
    '[
      {"name": "type_relance", "type": "select", "label": "Type de relance", "options": ["Email", "Téléphone", "SMS"], "required": true},
      {"name": "nombre_relances", "type": "number", "label": "Nombre de relances effectuées", "required": true}
    ]'::jsonb
  )
  RETURNING id INTO v_step5a_id;

  -- Étape 5b: Planification reconnaissance (si OUI à étape 4)
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back,
    form_fields
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    6,
    'Planification reconnaissance/expertise',
    'Organisation du rendez-vous pour la reconnaissance des dégâts',
    'meeting',
    false,
    false,
    false,
    '[
      {"name": "date_rdv", "type": "date", "label": "Date du RDV", "required": true},
      {"name": "expert_assigne", "type": "text", "label": "Expert assigné", "required": true},
      {"name": "lieu_rdv", "type": "textarea", "label": "Lieu du rendez-vous", "required": true}
    ]'::jsonb
  )
  RETURNING id INTO v_step5b_id;

  -- Étape 6: Réalisation reconnaissance
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back,
    form_fields
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    7,
    'Réalisation reconnaissance',
    'Visite sur place et constatation des dégâts',
    'action',
    false,
    false,
    false,
    '[
      {"name": "date_realisation", "type": "date", "label": "Date de réalisation", "required": true},
      {"name": "constats", "type": "textarea", "label": "Constats effectués", "required": true}
    ]'::jsonb
  )
  RETURNING id INTO v_step6_id;

  -- Étape 7: Rédaction rapport d'expertise
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back,
    form_fields, auto_actions
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    8,
    'Rédaction rapport d''expertise',
    'Rédaction et validation du rapport d''expertise détaillé',
    'document',
    false,
    false,
    false,
    '[
      {"name": "montant_estime", "type": "number", "label": "Montant estimé des travaux (€)", "required": true},
      {"name": "delai_travaux", "type": "text", "label": "Délai estimé des travaux", "required": true}
    ]'::jsonb,
    '[
      {"type": "generate_document", "documentType": "rapport_expertise"}
    ]'::jsonb
  )
  RETURNING id INTO v_step7_id;

  -- Étape 8: Envoi rapport au client
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back,
    form_fields
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    9,
    'Envoi rapport au client',
    'Transmission du rapport d''expertise au client',
    'notification',
    false,
    false,
    false,
    '[
      {"name": "mode_envoi", "type": "select", "label": "Mode d''envoi", "options": ["Email", "Courrier", "Remise en main propre"], "required": true}
    ]'::jsonb
  )
  RETURNING id INTO v_step8_id;

  -- Étape 9: DÉCISION - Validation client?
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    10,
    'Validation client?',
    'Le client valide-t-il le rapport et les préconisations?',
    'decision',
    true,
    false,
    false
  )
  RETURNING id INTO v_step9_id;

  -- Étape 10a: Modifications rapport (si NON)
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back,
    form_fields
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    11,
    'Modifications rapport',
    'Modifications du rapport suite aux remarques du client',
    'action',
    false,
    false,
    true,
    '[
      {"name": "modifications", "type": "textarea", "label": "Modifications demandées", "required": true}
    ]'::jsonb
  )
  RETURNING id INTO v_step10_id;

  -- Étape 10b: Préparation EDP (si OUI)
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back,
    form_fields, auto_actions
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    12,
    'Préparation EDP CONTENU',
    'Préparation de l''état des pertes et dommages',
    'document',
    false,
    false,
    false,
    '[
      {"name": "type_edp", "type": "select", "label": "Type EDP", "options": ["Standard", "Détaillé", "Simplifié"], "required": true}
    ]'::jsonb,
    '[
      {"type": "generate_document", "documentType": "edp"}
    ]'::jsonb
  )
  RETURNING id INTO v_step11_id;

  -- Étape 11: Mise en cause / Courrier assurance
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back,
    form_fields
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    13,
    'Mise en cause assurance',
    'Envoi de la mise en cause et du dossier à la compagnie d''assurance',
    'document',
    false,
    false,
    false,
    '[
      {"name": "compagnie", "type": "text", "label": "Compagnie d''assurance", "required": true},
      {"name": "numero_sinistre", "type": "text", "label": "Numéro de sinistre", "required": true}
    ]'::jsonb
  )
  RETURNING id INTO v_step12_id;

  -- Étape 12: Suivi négociation indemnisation
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back,
    form_fields
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    14,
    'Suivi négociation indemnisation',
    'Suivi des échanges avec l''assurance et négociation de l''indemnisation',
    'action',
    false,
    false,
    true,
    '[
      {"name": "statut_negociation", "type": "select", "label": "Statut", "options": ["En attente", "En cours", "Offre reçue", "Contre-proposition"], "required": true},
      {"name": "montant_propose", "type": "number", "label": "Montant proposé (€)", "required": false}
    ]'::jsonb
  )
  RETURNING id INTO v_step13_id;

  -- Étape 13: DÉCISION - Accord indemnisation?
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    15,
    'Accord indemnisation?',
    'Un accord a-t-il été trouvé avec l''assurance?',
    'decision',
    true,
    false,
    false
  )
  RETURNING id INTO v_step14_id;

  -- Étape 14: Versement indemnité
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description,
    step_type, requires_decision, is_optional, can_loop_back,
    form_fields
  ) VALUES (
    gen_random_uuid(),
    v_template_id,
    16,
    'Versement indemnité',
    'Vérification du versement de l''indemnité au client',
    'action',
    false,
    false,
    false,
    '[
      {"name": "montant_verse", "type": "number", "label": "Montant versé (€)", "required": true},
      {"name": "date_versement", "type": "date", "label": "Date de versement", "required": true}
    ]'::jsonb
  )
  RETURNING id INTO v_step15_id;

  -- 3. Maintenant, mettre à jour les liens entre les étapes (next_step, branches)

  -- Étape 1 -> Étape 2
  UPDATE workflow_steps SET next_step_id = v_step2_id WHERE id = v_step1_id;

  -- Étape 2 -> Étape 3
  UPDATE workflow_steps SET next_step_id = v_step3_id WHERE id = v_step2_id;

  -- Étape 3 -> Étape 4 (décision)
  UPDATE workflow_steps SET next_step_id = v_step4_id WHERE id = v_step3_id;

  -- Étape 4 (décision): Si NON -> Relance (5a), Si OUI -> Planification (5b)
  UPDATE workflow_steps 
  SET decision_yes_next_step_id = v_step5b_id,
      decision_no_next_step_id = v_step5a_id
  WHERE id = v_step4_id;

  -- Étape 5a (Relance) peut boucler vers étape 4 si besoin
  UPDATE workflow_steps SET next_step_id = v_step4_id WHERE id = v_step5a_id;

  -- Étape 5b (Planification) -> Étape 6 (Réalisation)
  UPDATE workflow_steps SET next_step_id = v_step6_id WHERE id = v_step5b_id;

  -- Étape 6 -> Étape 7 (Rapport)
  UPDATE workflow_steps SET next_step_id = v_step7_id WHERE id = v_step6_id;

  -- Étape 7 -> Étape 8 (Envoi rapport)
  UPDATE workflow_steps SET next_step_id = v_step8_id WHERE id = v_step7_id;

  -- Étape 8 -> Étape 9 (Décision validation)
  UPDATE workflow_steps SET next_step_id = v_step9_id WHERE id = v_step8_id;

  -- Étape 9 (décision): Si NON -> Modifications (10a), Si OUI -> EDP (10b)
  UPDATE workflow_steps 
  SET decision_yes_next_step_id = v_step11_id,
      decision_no_next_step_id = v_step10_id
  WHERE id = v_step9_id;

  -- Étape 10a (Modifications) peut boucler vers étape 7 (refaire rapport)
  UPDATE workflow_steps SET next_step_id = v_step7_id WHERE id = v_step10_id;

  -- Étape 10b (EDP) -> Étape 11 (Mise en cause)
  UPDATE workflow_steps SET next_step_id = v_step12_id WHERE id = v_step11_id;

  -- Étape 11 -> Étape 12 (Suivi négociation)
  UPDATE workflow_steps SET next_step_id = v_step13_id WHERE id = v_step12_id;

  -- Étape 12 -> Étape 13 (Décision accord)
  UPDATE workflow_steps SET next_step_id = v_step14_id WHERE id = v_step13_id;

  -- Étape 13 (décision): Si NON -> Retour négociation (12), Si OUI -> Versement (14)
  UPDATE workflow_steps 
  SET decision_yes_next_step_id = v_step15_id,
      decision_no_next_step_id = v_step13_id
  WHERE id = v_step14_id;

  -- Étape 14 (Versement) : Fin du workflow (pas de next_step)

  RAISE NOTICE 'Workflow JDE créé avec succès! Template ID: %', v_template_id;
  RAISE NOTICE 'Nombre d''étapes créées: 16';
  RAISE NOTICE 'Branches conditionnelles: 3 (Convention, Validation, Accord)';
  RAISE NOTICE 'Boucles de retour: 3 (Relance, Modifications, Négociation)';
END $$;
