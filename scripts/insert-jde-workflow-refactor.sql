DO $$
DECLARE
  v_world_id uuid := 'dadfb2f2-f8a7-482f-9e79-706703836a88';
  v_template_id uuid;

  -- Step IDs
  s1 uuid;  s2 uuid;  s3 uuid;  s4 uuid;
  s5 uuid;  s6 uuid;  s7 uuid;  s8 uuid;
  s9 uuid;  s10 uuid; s11 uuid; s12 uuid;
  s13 uuid; s14 uuid; s15 uuid;
BEGIN
  -------------------------------------------------------------------
  -- WORKFLOW TEMPLATE
  -------------------------------------------------------------------
  INSERT INTO workflow_templates (
    id, world_id, name, description, is_active, version
  ) VALUES (
    gen_random_uuid(),
    v_world_id,
    'Processus JDE Standard',
    'Workflow JDE conforme au processus métier réel avec branches conditionnelles',
    true,
    1
  )
  RETURNING id INTO v_template_id;

  -------------------------------------------------------------------
  -- 1. RÉCEPTION DOSSIER
  -- Documents: aucun
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 1,
    'Réception du dossier',
    'Création du dossier dans le système',
    'action', false, false, false,
    '[
      {"name":"date_reception","type":"date","required":true},
      {"name":"origine","type":"select","options":["Email","Téléphone","Courrier","Plateforme"],"required":true}
    ]', NULL
  ) RETURNING id INTO s1;

  -------------------------------------------------------------------
  -- 2. ANALYSE INITIALE
  -- Documents: pièces reçues
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 2,
    'Analyse initiale',
    'Vérification complétude dossier',
    'action', false, false, false,
    '[
      {"name":"complet","type":"select","options":["Oui","Non"],"required":true},
      {"name":"priorite","type":"select","options":["Normale","Urgente"],"required":true}
    ]', NULL
  ) RETURNING id INTO s2;

  -------------------------------------------------------------------
  -- 3. ENVOI CONVENTION / MANDAT
  -- Document: Convention ou Mandat (PDF)
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 3,
    'Envoi convention / mandat',
    'Envoi du document pour signature',
    'document', false, false, false,
    NULL,
    '[{"type":"generate_document","documentType":"convention"}]'
  ) RETURNING id INTO s3;

  -------------------------------------------------------------------
  -- 4. DÉCISION – CONVENTION SIGNÉE ?
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 4,
    'Convention signée ?',
    'Réception du document signé',
    'decision', true, false, false,
    NULL, NULL
  ) RETURNING id INTO s4;

  -------------------------------------------------------------------
  -- 5. RELANCE CONVENTION (SI NON)
  -- Document: Email / courrier relance
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 5,
    'Relance convention',
    'Relance client pour signature',
    'action', false, false, true,
    NULL, NULL
  ) RETURNING id INTO s5;

  -------------------------------------------------------------------
  -- 6. PLANIFICATION RECONNAISSANCE
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 6,
    'Planification reconnaissance',
    'Organisation RDV terrain',
    'meeting', false, false, false,
    NULL, NULL
  ) RETURNING id INTO s6;

  -------------------------------------------------------------------
  -- 7. RDV RECONNAISSANCE (PHOTOS TERRAIN)
  -- Documents: photos terrain
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 7,
    'Rendez-vous de reconnaissance',
    'Visite terrain avec photos',
    'action', false, false, false,
    '[
      {"name":"photos","type":"file","required":true},
      {"name":"observations","type":"textarea","required":true}
    ]', NULL
  ) RETURNING id INTO s7;

  -------------------------------------------------------------------
  -- 8. ÉDITION COURRIER MISE EN CAUSE
  -- Document: Courrier mise en cause
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 8,
    'Édition courrier mise en cause',
    'Envoi mise en cause assurance',
    'document', false, false, false,
    NULL,
    '[{"type":"generate_document","documentType":"courrier_mise_en_cause"}]'
  ) RETURNING id INTO s8;

  -------------------------------------------------------------------
  -- 9. DÉCISION – RAPPORT CONTENU MOBILIER ?
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 9,
    'Rapport contenu mobilier nécessaire ?',
    'Déterminer nécessité du rapport',
    'decision', true, false, false,
    NULL, NULL
  ) RETURNING id INTO s9;

  -------------------------------------------------------------------
  -- 10. RAPPORT CONTENU MOBILIER (OPTIONNEL)
  -- Document: Rapport contenu mobilier
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 10,
    'Génération rapport contenu mobilier',
    'Rapport mobilier détaillé',
    'document', false, true, false,
    NULL,
    '[{"type":"generate_document","documentType":"rapport_contenu_mobilier"}]'
  ) RETURNING id INTO s10;

  -------------------------------------------------------------------
  -- 11. RAPPORT D’EXPERTISE
  -- Document: Rapport expertise principal
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 11,
    'Rédaction rapport d’expertise',
    'Rapport technique global',
    'document', false, false, false,
    NULL,
    '[{"type":"generate_document","documentType":"rapport_expertise"}]'
  ) RETURNING id INTO s11;

  -------------------------------------------------------------------
  -- 12. VALIDATION CLIENT ?
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 12,
    'Validation client ?',
    'Validation du rapport',
    'decision', true, false, false,
    NULL, NULL
  ) RETURNING id INTO s12;

  -------------------------------------------------------------------
  -- 13. PRÉPARATION EDP
  -- Document: Tableau de relevé EDP FINI
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 13,
    'Préparation EDP',
    'EDP pour assurance',
    'document', false, false, false,
    NULL,
    '[{"type":"generate_document","documentType":"edp"}]'
  ) RETURNING id INTO s13;

  -------------------------------------------------------------------
  -- 14. ACCORD INDEMNISATION ?
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 14,
    'Accord indemnisation ?',
    'Accord avec assurance',
    'decision', true, false, false,
    NULL, NULL
  ) RETURNING id INTO s14;

  -------------------------------------------------------------------
  -- 15. VERSEMENT INDEMNITÉ
  -------------------------------------------------------------------
  INSERT INTO workflow_steps VALUES (
    gen_random_uuid(), v_template_id, 15,
    'Versement indemnité',
    'Indemnité reçue',
    'action', false, false, false,
    NULL, NULL
  ) RETURNING id INTO s15;

  -------------------------------------------------------------------
  -- LINKS / BRANCHES
  -------------------------------------------------------------------
  UPDATE workflow_steps SET next_step_id = s2 WHERE id = s1;
  UPDATE workflow_steps SET next_step_id = s3 WHERE id = s2;
  UPDATE workflow_steps SET next_step_id = s4 WHERE id = s3;

  UPDATE workflow_steps SET
    decision_yes_next_step_id = s6,
    decision_no_next_step_id  = s5
  WHERE id = s4;

  UPDATE workflow_steps SET next_step_id = s4 WHERE id = s5;
  UPDATE workflow_steps SET next_step_id = s7 WHERE id = s6;
  UPDATE workflow_steps SET next_step_id = s8 WHERE id = s7;
  UPDATE workflow_steps SET next_step_id = s9 WHERE id = s8;

  UPDATE workflow_steps SET
    decision_yes_next_step_id = s10,
    decision_no_next_step_id  = s11
  WHERE id = s9;

  UPDATE workflow_steps SET next_step_id = s11 WHERE id = s10;
  UPDATE workflow_steps SET next_step_id = s12 WHERE id = s11;

  UPDATE workflow_steps SET
    decision_yes_next_step_id = s13,
    decision_no_next_step_id  = s11
  WHERE id = s12;

  UPDATE workflow_steps SET next_step_id = s14 WHERE id = s13;

  UPDATE workflow_steps SET
    decision_yes_next_step_id = s15,
    decision_no_next_step_id  = s13
  WHERE id = s14;

  RAISE NOTICE 'JDE workflow successfully created: %', v_template_id;
END $$;
  