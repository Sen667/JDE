-- Insert JDMO Workflow Template and Steps
-- Get the JDMO world ID
DO $$
DECLARE
  v_world_id UUID;
  v_template_id UUID;
  v_step1_id UUID;
  v_step2_id UUID;
  v_step3_id UUID;
  v_step4_id UUID;
  v_step5_id UUID;
  v_step6a_id UUID;
  v_step6b_id UUID;
  v_step7a_id UUID;
  v_step7b_id UUID;
  v_step8_id UUID;
  v_step9_id UUID;
BEGIN
  -- Get JDMO world
  SELECT id INTO v_world_id FROM worlds WHERE code = 'JDMO';
  
  IF v_world_id IS NULL THEN
    RAISE EXCEPTION 'JDMO world not found';
  END IF;

  -- Create workflow template for JDMO
  INSERT INTO workflow_templates (id, world_id, name, description, version, is_active)
  VALUES (
    gen_random_uuid(),
    v_world_id,
    'Processus JDMO - Maîtrise d''Œuvre',
    'Workflow complet pour la gestion des dossiers de maîtrise d''œuvre, de la création client jusqu''à l''archivage',
    1,
    true
  )
  RETURNING id INTO v_template_id;

  -- Step 1: Création fiche client
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description, step_type,
    form_fields, metadata
  )
  VALUES (
    gen_random_uuid(),
    v_template_id,
    1,
    'Création fiche client',
    'Création de la fiche client avec informations du chantier',
    'action',
    '[
      {"name": "source_creation", "label": "Source de création", "type": "select", "options": ["Direct", "Transfert JDE"], "required": true},
      {"name": "client_type", "label": "Type de client", "type": "select", "options": ["Particulier", "Professionnel"], "required": true},
      {"name": "nom", "label": "Nom", "type": "text", "required": true},
      {"name": "prenom", "label": "Prénom", "type": "text", "required": true},
      {"name": "telephone", "label": "Téléphone", "type": "tel", "required": true},
      {"name": "email", "label": "Email", "type": "email", "required": true},
      {"name": "adresse_chantier", "label": "Adresse du chantier", "type": "textarea", "required": true},
      {"name": "type_travaux", "label": "Type de travaux", "type": "text", "required": true}
    ]'::jsonb,
    '{"icon": "user-plus", "color": "blue"}'::jsonb
  )
  RETURNING id INTO v_step1_id;

  -- Step 2: Envoi contrat maîtrise d'œuvre
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description, step_type,
    form_fields, metadata
  )
  VALUES (
    gen_random_uuid(),
    v_template_id,
    2,
    'Envoi contrat maîtrise d''œuvre',
    'Envoi et signature du contrat de maîtrise d''œuvre avec attestations',
    'document',
    '[
      {"name": "contrat_signe", "label": "Contrat signé", "type": "checkbox", "required": true},
      {"name": "date_signature", "label": "Date de signature", "type": "date", "required": true},
      {"name": "attestation_decennale", "label": "Attestation décennale", "type": "file", "required": true},
      {"name": "attestation_tva", "label": "Attestation TVA", "type": "file", "required": false},
      {"name": "mode_envoi", "label": "Mode d''envoi", "type": "select", "options": ["Email", "Courrier", "Remise en main propre"], "required": true}
    ]'::jsonb,
    '{"icon": "file-text", "color": "green"}'::jsonb
  )
  RETURNING id INTO v_step2_id;

  -- Step 3: Réalisation plans
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description, step_type,
    form_fields, metadata
  )
  VALUES (
    gen_random_uuid(),
    v_template_id,
    3,
    'Réalisation plans',
    'Réalisation des plans techniques, photos et croquis',
    'document',
    '[
      {"name": "photos", "label": "Photos du chantier", "type": "file", "multiple": true, "required": true},
      {"name": "croquis", "label": "Croquis", "type": "file", "multiple": true, "required": false},
      {"name": "plans_techniques", "label": "Plans techniques", "type": "file", "multiple": true, "required": true},
      {"name": "notes_techniques", "label": "Notes techniques", "type": "textarea", "required": false},
      {"name": "date_realisation", "label": "Date de réalisation", "type": "date", "required": true}
    ]'::jsonb,
    '{"icon": "layout", "color": "purple"}'::jsonb
  )
  RETURNING id INTO v_step3_id;

  -- Step 4: Démarches administratives
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description, step_type,
    form_fields, metadata
  )
  VALUES (
    gen_random_uuid(),
    v_template_id,
    4,
    'Démarches administratives',
    'Dépôt et suivi des démarches administratives (DT, PC, etc.)',
    'action',
    '[
      {"name": "type_demarche", "label": "Type de démarche", "type": "select", "options": ["Déclaration de travaux", "Permis de construire", "Autre"], "required": true},
      {"name": "documents_administratifs", "label": "Documents administratifs", "type": "file", "multiple": true, "required": true},
      {"name": "date_depot", "label": "Date de dépôt", "type": "date", "required": true},
      {"name": "numero_dossier_admin", "label": "Numéro de dossier administratif", "type": "text", "required": false},
      {"name": "statut_demarche", "label": "Statut de la démarche", "type": "select", "options": ["En cours", "Accepté", "Refusé"], "required": true}
    ]'::jsonb,
    '{"icon": "file-check", "color": "orange"}'::jsonb
  )
  RETURNING id INTO v_step4_id;

  -- Step 5: Visite de pré-réception (DECISION POINT)
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description, step_type,
    requires_decision, form_fields, metadata
  )
  VALUES (
    gen_random_uuid(),
    v_template_id,
    5,
    'Visite de pré-réception',
    'Visite de pré-réception avec décision : conforme (OUI) ou réserves (NON)',
    'decision',
    true,
    '[
      {"name": "date_visite", "label": "Date de visite", "type": "date", "required": true},
      {"name": "participants", "label": "Participants", "type": "textarea", "required": true},
      {"name": "bilan_visite", "label": "Bilan de la visite", "type": "select", "options": ["Conforme", "Réserves"], "required": true},
      {"name": "observations", "label": "Observations", "type": "textarea", "required": false},
      {"name": "photos_visite", "label": "Photos de la visite", "type": "file", "multiple": true, "required": false}
    ]'::jsonb,
    '{"icon": "eye", "color": "yellow", "decision_label_yes": "Conforme", "decision_label_no": "Réserves"}'::jsonb
  )
  RETURNING id INTO v_step5_id;

  -- Step 6a: Liste des réserves (if NON)
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description, step_type,
    form_fields, metadata
  )
  VALUES (
    gen_random_uuid(),
    v_template_id,
    6,
    'Liste des réserves',
    'Établissement de la liste des réserves à lever',
    'document',
    '[
      {"name": "reserves", "label": "Liste des réserves", "type": "textarea", "required": true},
      {"name": "gravite", "label": "Gravité", "type": "select", "options": ["Mineure", "Majeure"], "required": true},
      {"name": "delai_levee", "label": "Délai de levée", "type": "date", "required": true},
      {"name": "document_reserves", "label": "Document des réserves", "type": "file", "required": true}
    ]'::jsonb,
    '{"icon": "alert-circle", "color": "red", "branch": "no"}'::jsonb
  )
  RETURNING id INTO v_step6a_id;

  -- Step 6b: Envoi DBCS (if OUI - conforme)
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description, step_type,
    auto_actions, metadata
  )
  VALUES (
    gen_random_uuid(),
    v_template_id,
    6,
    'Envoi DBCS',
    'Transfert automatique vers DBCS pour archivage et génération PV',
    'action',
    '[
      {"type": "transfer_world", "target_world": "DBCS", "auto": true},
      {"type": "generate_document", "template": "pv_reception", "auto": true},
      {"type": "notify", "recipients": ["dbcs_team"], "message": "Nouveau dossier transféré depuis JDMO"}
    ]'::jsonb,
    '{"icon": "send", "color": "blue", "branch": "yes", "auto_trigger": true}'::jsonb
  )
  RETURNING id INTO v_step6b_id;

  -- Step 7a: Signature réserves (after 6a)
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description, step_type,
    form_fields, metadata
  )
  VALUES (
    gen_random_uuid(),
    v_template_id,
    7,
    'Signature réserves',
    'Signature de la levée des réserves par le client',
    'document',
    '[
      {"name": "reserves_levees", "label": "Réserves levées", "type": "checkbox", "required": true},
      {"name": "date_levee", "label": "Date de levée", "type": "date", "required": true},
      {"name": "document_levee", "label": "Document de levée signé", "type": "file", "required": true},
      {"name": "photos_apres", "label": "Photos après travaux", "type": "file", "multiple": true, "required": false}
    ]'::jsonb,
    '{"icon": "check-circle", "color": "green", "branch": "no"}'::jsonb
  )
  RETURNING id INTO v_step7a_id;

  -- Step 7b: Génération PV (after 6b - auto)
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description, step_type,
    auto_actions, metadata
  )
  VALUES (
    gen_random_uuid(),
    v_template_id,
    7,
    'Génération PV de réception',
    'Génération automatique du procès-verbal de réception',
    'document',
    '[
      {"type": "generate_document", "template": "pv_reception_finale", "auto": true}
    ]'::jsonb,
    '{"icon": "file-text", "color": "green", "branch": "yes", "auto_trigger": true}'::jsonb
  )
  RETURNING id INTO v_step7b_id;

  -- Step 8: Signature finale
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description, step_type,
    form_fields, metadata
  )
  VALUES (
    gen_random_uuid(),
    v_template_id,
    8,
    'Signature finale',
    'Signature finale du dossier par le client',
    'document',
    '[
      {"name": "type_signature", "label": "Type de signature", "type": "select", "options": ["Sur place", "En ligne"], "required": true},
      {"name": "date_signature", "label": "Date de signature", "type": "date", "required": true},
      {"name": "signataire", "label": "Signataire", "type": "text", "required": true},
      {"name": "document_signe", "label": "Document signé", "type": "file", "required": true}
    ]'::jsonb,
    '{"icon": "pen-tool", "color": "indigo"}'::jsonb
  )
  RETURNING id INTO v_step8_id;

  -- Step 9: Archivage
  INSERT INTO workflow_steps (
    id, workflow_template_id, step_number, name, description, step_type,
    form_fields, metadata
  )
  VALUES (
    gen_random_uuid(),
    v_template_id,
    9,
    'Archivage',
    'Archivage final du dossier',
    'action',
    '[
      {"name": "date_archivage", "label": "Date d''archivage", "type": "date", "required": true},
      {"name": "notes_archivage", "label": "Notes d''archivage", "type": "textarea", "required": false}
    ]'::jsonb,
    '{"icon": "archive", "color": "gray"}'::jsonb
  )
  RETURNING id INTO v_step9_id;

  -- Update next_step_id links for linear path (1->2->3->4->5)
  UPDATE workflow_steps SET next_step_id = v_step2_id WHERE id = v_step1_id;
  UPDATE workflow_steps SET next_step_id = v_step3_id WHERE id = v_step2_id;
  UPDATE workflow_steps SET next_step_id = v_step4_id WHERE id = v_step3_id;
  UPDATE workflow_steps SET next_step_id = v_step5_id WHERE id = v_step4_id;

  -- Step 5 decision paths
  UPDATE workflow_steps SET 
    decision_yes_next_step_id = v_step6b_id,
    decision_no_next_step_id = v_step6a_id
  WHERE id = v_step5_id;

  -- Step 6a -> 7a -> 8
  UPDATE workflow_steps SET next_step_id = v_step7a_id WHERE id = v_step6a_id;
  UPDATE workflow_steps SET next_step_id = v_step8_id WHERE id = v_step7a_id;

  -- Step 6b -> 7b -> 8
  UPDATE workflow_steps SET next_step_id = v_step7b_id WHERE id = v_step6b_id;
  UPDATE workflow_steps SET next_step_id = v_step8_id WHERE id = v_step7b_id;

  -- Step 8 -> 9
  UPDATE workflow_steps SET next_step_id = v_step9_id WHERE id = v_step8_id;

  RAISE NOTICE 'JDMO workflow created successfully with % steps', 11;
END $$;