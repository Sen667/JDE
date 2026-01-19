-- ============================================
-- JDMO WORKFLOW - Maîtrise d'Œuvre (14 étapes)
-- ============================================
-- Ce workflow gère le processus complet de maîtrise d'œuvre
-- avec décisions, branchements conditionnels et transfert vers DBCS

DO $$
DECLARE
  v_workflow_id UUID;
  v_world_id UUID;
  
  -- Step IDs
  v_step1_id UUID;
  v_step2_id UUID;
  v_step3_id UUID;
  v_step4_id UUID;
  v_step5_id UUID;
  v_step6_id UUID;
  v_step7_id UUID;
  v_step8_id UUID;
  v_step9_id UUID;
  v_step10_id UUID;
  v_step11_id UUID;
  v_step12_id UUID;
  v_step13_id UUID;
  v_step14_id UUID;
BEGIN
  -- Get JDMO world ID
  SELECT id INTO v_world_id FROM public.worlds WHERE code = 'JDMO';
  
  IF v_world_id IS NULL THEN
    RAISE EXCEPTION 'JDMO world not found';
  END IF;

  -- Delete existing JDMO workflows
  DELETE FROM public.workflow_steps 
  WHERE workflow_template_id IN (
    SELECT id FROM public.workflow_templates WHERE world_id = v_world_id
  );
  
  DELETE FROM public.workflow_templates WHERE world_id = v_world_id;

  -- Create new workflow template
  INSERT INTO public.workflow_templates (world_id, name, description, version, is_active)
  VALUES (
    v_world_id,
    'Workflow JDMO Complet',
    'Workflow de maîtrise d''œuvre avec visite pré-réception et transfert conditionnel vers DBCS',
    1,
    true
  )
  RETURNING id INTO v_workflow_id;

  -- ============================================
  -- ÉTAPE 1: Création du client
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, is_required
  ) VALUES (
    v_workflow_id, 1,
    'Création du client',
    'Enregistrement des informations du client',
    'action',
    '[
      {"name": "nom", "type": "text", "label": "Nom", "required": true},
      {"name": "prenom", "type": "text", "label": "Prénom", "required": true},
      {"name": "email", "type": "email", "label": "Email", "required": true},
      {"name": "telephone", "type": "tel", "label": "Téléphone", "required": true},
      {"name": "adresse", "type": "textarea", "label": "Adresse du chantier", "required": true}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step1_id;

  -- ============================================
  -- ÉTAPE 2: Envoi contrat maîtrise d'œuvre
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, auto_actions, is_required
  ) VALUES (
    v_workflow_id, 2,
    'Envoi contrat maîtrise d''œuvre',
    'Génération et envoi automatique du contrat avec signature électronique',
    'document',
    '[
      {"name": "montant_honoraires", "type": "number", "label": "Montant des honoraires (€)", "required": true},
      {"name": "duree_mission", "type": "text", "label": "Durée de la mission", "required": true},
      {"name": "conditions_particulieres", "type": "textarea", "label": "Conditions particulières"}
    ]'::jsonb,
    '[
      {"type": "generate_document", "template": "contrat_maitrise_oeuvre"},
      {"type": "send_email", "to": "client", "subject": "Contrat de maîtrise d''œuvre", "with_signature_link": true}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step2_id;

  -- ============================================
  -- ÉTAPE 3: Réalisation des plans
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, is_required
  ) VALUES (
    v_workflow_id, 3,
    'Réalisation des plans',
    'Upload des plans techniques, photos et croquis du chantier',
    'action',
    '[
      {"name": "type_document", "type": "select", "label": "Type de document", "options": ["Plan architectural", "Plan technique", "Photo", "Croquis"], "required": true},
      {"name": "description", "type": "textarea", "label": "Description"},
      {"name": "fichiers", "type": "file", "label": "Fichiers à uploader", "multiple": true, "required": true}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step3_id;

  -- ============================================
  -- ÉTAPE 4: Préparation documents administratifs
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, is_required
  ) VALUES (
    v_workflow_id, 4,
    'Préparation documents administratifs',
    'Rassemblement et vérification des documents nécessaires',
    'action',
    '[
      {"name": "documents_prepares", "type": "checkbox", "label": "Documents préparés", "options": ["Plan de masse", "Plan de situation", "Notice descriptive", "Photos"], "required": true},
      {"name": "observations", "type": "textarea", "label": "Observations"}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step4_id;

  -- ============================================
  -- ÉTAPE 5: Déclaration de travaux / Permis
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, is_required
  ) VALUES (
    v_workflow_id, 5,
    'Déclaration de travaux / Permis de construire',
    'Dépôt et suivi de la déclaration ou du permis',
    'action',
    '[
      {"name": "type_autorisation", "type": "select", "label": "Type d''autorisation", "options": ["Déclaration préalable", "Permis de construire", "Pas d''autorisation nécessaire"], "required": true},
      {"name": "numero_dossier", "type": "text", "label": "Numéro de dossier"},
      {"name": "date_depot", "type": "date", "label": "Date de dépôt", "required": true},
      {"name": "statut", "type": "select", "label": "Statut", "options": ["Déposé", "En instruction", "Accordé", "Refusé"], "required": true}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step5_id;

  -- ============================================
  -- ÉTAPE 6: Import documents obligatoires
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, is_required
  ) VALUES (
    v_workflow_id, 6,
    'Import documents obligatoires',
    'Upload des documents réglementaires et assurances',
    'action',
    '[
      {"name": "documents_importes", "type": "checkbox", "label": "Documents importés", "options": ["Attestation RC Pro", "Garantie décennale", "Autorisation administrative", "PV de réunion"], "required": true},
      {"name": "fichiers", "type": "file", "label": "Fichiers", "multiple": true, "required": true}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step6_id;

  -- ============================================
  -- ÉTAPE 7: Visite de pré-réception
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, is_required
  ) VALUES (
    v_workflow_id, 7,
    'Visite de pré-réception',
    'Inspection du chantier avant réception définitive',
    'meeting',
    '[
      {"name": "date_visite", "type": "datetime", "label": "Date et heure de la visite", "required": true},
      {"name": "participants", "type": "textarea", "label": "Participants présents", "required": true},
      {"name": "observations_generales", "type": "textarea", "label": "Observations générales", "required": true}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step7_id;

  -- ============================================
  -- ÉTAPE 8: DÉCISION - Bilan de la visite
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    requires_decision, is_required
  ) VALUES (
    v_workflow_id, 8,
    'Bilan de la visite de pré-réception',
    'Décision: Le bilan de la visite est-il satisfaisant ?',
    'decision',
    true,
    true
  ) RETURNING id INTO v_step8_id;

  -- ============================================
  -- BRANCHE OUI - ÉTAPE 9: Liste des réserves
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, is_optional
  ) VALUES (
    v_workflow_id, 9,
    'Liste des réserves (si nécessaire)',
    'Établissement de la liste des travaux à reprendre',
    'action',
    '[
      {"name": "nombre_reserves", "type": "number", "label": "Nombre de réserves", "required": true},
      {"name": "reserves", "type": "textarea", "label": "Détail des réserves", "required": true},
      {"name": "gravite", "type": "select", "label": "Gravité globale", "options": ["Mineure", "Moyenne", "Majeure"], "required": true}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step9_id;

  -- ============================================
  -- BRANCHE OUI - ÉTAPE 10: Signature liste réserves
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    auto_actions, is_required
  ) VALUES (
    v_workflow_id, 10,
    'Document et signature liste des réserves',
    'Génération du document et signature électronique',
    'document',
    '[
      {"type": "generate_document", "template": "liste_reserves"},
      {"type": "send_email", "to": "client", "subject": "Liste des réserves à signer", "with_signature_link": true}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step10_id;

  -- ============================================
  -- BRANCHE OUI - ÉTAPE 11: Envoi vers DBCS
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    auto_actions, is_required
  ) VALUES (
    v_workflow_id, 11,
    'Envoi automatique vers DBCS',
    'Transfert du dossier vers la base de connaissance',
    'action',
    '[
      {"type": "create_notification", "message": "Dossier envoyé vers DBCS pour archivage"}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step11_id;

  -- ============================================
  -- BRANCHE OUI - ÉTAPE 12: Génération PV de réception
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, auto_actions, is_required
  ) VALUES (
    v_workflow_id, 12,
    'Génération automatique PV de réception',
    'Création du procès-verbal de réception des travaux',
    'document',
    '[
      {"name": "date_reception", "type": "date", "label": "Date de réception", "required": true},
      {"name": "travaux_conformes", "type": "select", "label": "Travaux conformes", "options": ["Oui", "Oui avec réserves"], "required": true}
    ]'::jsonb,
    '[
      {"type": "generate_document", "template": "pv_reception"}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step12_id;

  -- ============================================
  -- BRANCHE OUI - ÉTAPE 13: Signature PV
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, auto_actions, is_required
  ) VALUES (
    v_workflow_id, 13,
    'Signature sur place ou en ligne',
    'Signature du PV de réception par toutes les parties',
    'action',
    '[
      {"name": "mode_signature", "type": "select", "label": "Mode de signature", "options": ["Sur place", "En ligne"], "required": true},
      {"name": "date_signature", "type": "datetime", "label": "Date de signature", "required": true},
      {"name": "signataires", "type": "textarea", "label": "Liste des signataires", "required": true}
    ]'::jsonb,
    '[
      {"type": "send_email", "to": "all_parties", "subject": "PV de réception signé"}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step13_id;

  -- ============================================
  -- BRANCHE NON - ÉTAPE 14: Archivage direct
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, auto_actions, is_required
  ) VALUES (
    v_workflow_id, 14,
    'Archivage direct vers DBCS',
    'Dossier non satisfaisant - envoi direct vers DBCS',
    'action',
    '[
      {"name": "motif_archivage", "type": "textarea", "label": "Motif de l''archivage direct", "required": true},
      {"name": "commentaires", "type": "textarea", "label": "Commentaires supplémentaires"}
    ]'::jsonb,
    '[
      {"type": "create_notification", "message": "Dossier archivé directement dans DBCS suite à visite non satisfaisante"}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step14_id;

  -- ============================================
  -- LINKING DES ÉTAPES
  -- ============================================
  
  -- Séquence linéaire jusqu'à la décision
  UPDATE public.workflow_steps SET next_step_id = v_step2_id WHERE id = v_step1_id;
  UPDATE public.workflow_steps SET next_step_id = v_step3_id WHERE id = v_step2_id;
  UPDATE public.workflow_steps SET next_step_id = v_step4_id WHERE id = v_step3_id;
  UPDATE public.workflow_steps SET next_step_id = v_step5_id WHERE id = v_step4_id;
  UPDATE public.workflow_steps SET next_step_id = v_step6_id WHERE id = v_step5_id;
  UPDATE public.workflow_steps SET next_step_id = v_step7_id WHERE id = v_step6_id;
  UPDATE public.workflow_steps SET next_step_id = v_step8_id WHERE id = v_step7_id;

  -- Point de décision (étape 8)
  UPDATE public.workflow_steps 
  SET 
    decision_yes_next_step_id = v_step9_id,
    decision_no_next_step_id = v_step14_id
  WHERE id = v_step8_id;

  -- Branche OUI (9 -> 10 -> 11 -> 12 -> 13 -> FIN)
  UPDATE public.workflow_steps SET next_step_id = v_step10_id WHERE id = v_step9_id;
  UPDATE public.workflow_steps SET next_step_id = v_step11_id WHERE id = v_step10_id;
  UPDATE public.workflow_steps SET next_step_id = v_step12_id WHERE id = v_step11_id;
  UPDATE public.workflow_steps SET next_step_id = v_step13_id WHERE id = v_step12_id;
  -- v_step13_id -> NULL (fin du workflow)

  -- Branche NON (14 -> FIN)
  -- v_step14_id -> NULL (fin du workflow)

  RAISE NOTICE 'Workflow JDMO créé avec succès!';
  RAISE NOTICE 'Template ID: %', v_workflow_id;
  RAISE NOTICE 'Total étapes: 14';
  RAISE NOTICE '- Étapes séquentielles: 1-7';
  RAISE NOTICE '- Point de décision: 8';
  RAISE NOTICE '- Branche OUI: 9-13 (5 étapes)';
  RAISE NOTICE '- Branche NON: 14 (archivage direct)';
END $$;