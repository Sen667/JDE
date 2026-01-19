-- MySQL-compatible JDE workflow script
-- Converted from PostgreSQL syntax

DELIMITER $$

DROP PROCEDURE IF EXISTS InsertJDEWorkflow$$

CREATE PROCEDURE InsertJDEWorkflow()
BEGIN
  DECLARE v_world_id CHAR(36) DEFAULT 'dadfb2f2-f8a7-482f-9e79-706703836a88';
  DECLARE v_template_id CHAR(36);

  -- Step IDs
  DECLARE s1 CHAR(36); DECLARE s2 CHAR(36); DECLARE s3 CHAR(36); DECLARE s4 CHAR(36);
  DECLARE s5 CHAR(36); DECLARE s6 CHAR(36); DECLARE s7 CHAR(36); DECLARE s8 CHAR(36);
  DECLARE s9 CHAR(36); DECLARE s10 CHAR(36); DECLARE s11 CHAR(36); DECLARE s12 CHAR(36);
  DECLARE s13 CHAR(36); DECLARE s14 CHAR(36); DECLARE s15 CHAR(36);

  -------------------------------------------------------------------
  -- WORKFLOW TEMPLATE
  -------------------------------------------------------------------
  SET v_template_id = UUID();
  INSERT INTO workflow_templates (
    id, world_id, name, description, is_active, version, created_at, updated_at
  ) VALUES (
    v_template_id,
    v_world_id,
    'Processus JDE Standard',
    'Workflow JDE conforme au processus métier réel avec branches conditionnelles',
    true,
    1,
    NOW(),
    NOW()
  );

  -------------------------------------------------------------------
  -- 1. RÉCEPTION DOSSIER
  -------------------------------------------------------------------
  SET s1 = UUID();
  INSERT INTO workflow_steps VALUES (
    s1, v_template_id, 1,
    'Réception du dossier',
    'Création du dossier dans le système',
    'action', false, false, false,
    '[
      {"name":"date_reception","type":"date","required":true},
      {"name":"origine","type":"select","options":["Email","Téléphone","Courrier","Plateforme"],"required":true}
    ]', NULL, NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 2. ANALYSE INITIALE
  -------------------------------------------------------------------
  SET s2 = UUID();
  INSERT INTO workflow_steps VALUES (
    s2, v_template_id, 2,
    'Analyse initiale',
    'Vérification complétude dossier',
    'action', false, false, false,
    '[
      {"name":"complet","type":"select","options":["Oui","Non"],"required":true},
      {"name":"priorite","type":"select","options":["Normale","Urgente"],"required":true}
    ]', NULL, NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 3. ENVOI CONVENTION / MANDAT
  -------------------------------------------------------------------
  SET s3 = UUID();
  INSERT INTO workflow_steps VALUES (
    s3, v_template_id, 3,
    'Envoi convention / mandat',
    'Envoi du document pour signature',
    'document', false, false, false,
    NULL,
    '[{"type":"generate_document","documentType":"convention"}]',
    NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 4. DÉCISION – CONVENTION SIGNÉE ?
  -------------------------------------------------------------------
  SET s4 = UUID();
  INSERT INTO workflow_steps VALUES (
    s4, v_template_id, 4,
    'Convention signée ?',
    'Réception du document signé',
    'decision', true, false, false,
    NULL, NULL, NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 5. RELANCE CONVENTION (SI NON)
  -------------------------------------------------------------------
  SET s5 = UUID();
  INSERT INTO workflow_steps VALUES (
    s5, v_template_id, 5,
    'Relance convention',
    'Relance client pour signature',
    'action', false, false, true,
    NULL, NULL, NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 6. PLANIFICATION RECONNAISSANCE
  -------------------------------------------------------------------
  SET s6 = UUID();
  INSERT INTO workflow_steps VALUES (
    s6, v_template_id, 6,
    'Planification reconnaissance',
    'Organisation RDV terrain',
    'meeting', false, false, false,
    NULL, NULL, NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 7. RDV RECONNAISSANCE (PHOTOS TERRAIN)
  -------------------------------------------------------------------
  SET s7 = UUID();
  INSERT INTO workflow_steps VALUES (
    s7, v_template_id, 7,
    'Rendez-vous de reconnaissance',
    'Visite terrain avec photos',
    'action', false, false, false,
    '[
      {"name":"photos","type":"file","required":true},
      {"name":"observations","type":"textarea","required":true}
    ]', NULL, NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 8. ÉDITION COURRIER MISE EN CAUSE
  -------------------------------------------------------------------
  SET s8 = UUID();
  INSERT INTO workflow_steps VALUES (
    s8, v_template_id, 8,
    'Édition courrier mise en cause',
    'Envoi mise en cause assurance',
    'document', false, false, false,
    NULL,
    '[{"type":"generate_document","documentType":"courrier_mise_en_cause"}]',
    NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 9. DÉCISION – RAPPORT CONTENU MOBILIER ?
  -------------------------------------------------------------------
  SET s9 = UUID();
  INSERT INTO workflow_steps VALUES (
    s9, v_template_id, 9,
    'Rapport contenu mobilier nécessaire ?',
    'Déterminer nécessité du rapport',
    'decision', true, false, false,
    NULL, NULL, NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 10. RAPPORT CONTENU MOBILIER (OPTIONNEL)
  -------------------------------------------------------------------
  SET s10 = UUID();
  INSERT INTO workflow_steps VALUES (
    s10, v_template_id, 10,
    'Génération rapport contenu mobilier',
    'Rapport mobilier détaillé',
    'document', false, true, false,
    NULL,
    '[{"type":"generate_document","documentType":"rapport_contenu_mobilier"}]',
    NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 11. RAPPORT D’EXPERTISE
  -------------------------------------------------------------------
  SET s11 = UUID();
  INSERT INTO workflow_steps VALUES (
    s11, v_template_id, 11,
    'Rédaction rapport d’expertise',
    'Rapport technique global',
    'document', false, false, false,
    NULL,
    '[{"type":"generate_document","documentType":"rapport_expertise"}]',
    NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 12. VALIDATION CLIENT ?
  -------------------------------------------------------------------
  SET s12 = UUID();
  INSERT INTO workflow_steps VALUES (
    s12, v_template_id, 12,
    'Validation client ?',
    'Validation du rapport',
    'decision', true, false, false,
    NULL, NULL, NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 13. PRÉPARATION EDP
  -------------------------------------------------------------------
  SET s13 = UUID();
  INSERT INTO workflow_steps VALUES (
    s13, v_template_id, 13,
    'Préparation EDP',
    'EDP pour assurance',
    'document', false, false, false,
    NULL,
    '[{"type":"generate_document","documentType":"edp"}]',
    NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 14. ACCORD INDEMNISATION ?
  -------------------------------------------------------------------
  SET s14 = UUID();
  INSERT INTO workflow_steps VALUES (
    s14, v_template_id, 14,
    'Accord indemnisation ?',
    'Accord avec assurance',
    'decision', true, false, false,
    NULL, NULL, NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- 15. VERSEMENT INDEMNITÉ
  -------------------------------------------------------------------
  SET s15 = UUID();
  INSERT INTO workflow_steps VALUES (
    s15, v_template_id, 15,
    'Versement indemnité',
    'Indemnité reçue',
    'action', false, false, false,
    NULL, NULL, NOW(), NOW()
  );

  -------------------------------------------------------------------
  -- LINKS / BRANCHES
  -------------------------------------------------------------------
  UPDATE workflow_steps SET next_step_id = s2 WHERE id = s1;
  UPDATE workflow_steps SET next_step_id = s3 WHERE id = s2;
  UPDATE workflow_steps SET next_step_id = s4 WHERE id = s3;

  UPDATE workflow_steps SET
    decision_yes_next_step_id = s6,
    decision_no_next_step_id = s5
  WHERE id = s4;

  UPDATE workflow_steps SET next_step_id = s4 WHERE id = s5;
  UPDATE workflow_steps SET next_step_id = s7 WHERE id = s6;
  UPDATE workflow_steps SET next_step_id = s8 WHERE id = s7;
  UPDATE workflow_steps SET next_step_id = s9 WHERE id = s8;

  UPDATE workflow_steps SET
    decision_yes_next_step_id = s10,
    decision_no_next_step_id = s11
  WHERE id = s9;

  UPDATE workflow_steps SET next_step_id = s11 WHERE id = s10;
  UPDATE workflow_steps SET next_step_id = s12 WHERE id = s11;

  UPDATE workflow_steps SET
    decision_yes_next_step_id = s13,
    decision_no_next_step_id = s11
  WHERE id = s12;

  UPDATE workflow_steps SET next_step_id = s14 WHERE id = s13;

  UPDATE workflow_steps SET
    decision_yes_next_step_id = s15,
    decision_no_next_step_id = s13
  WHERE id = s14;

  SELECT CONCAT('JDE workflow successfully created: ', v_template_id) as result;

END$$

DELIMITER ;

-- Execute the procedure
CALL InsertJDEWorkflow();

-- Clean up
DROP PROCEDURE IF EXISTS InsertJDEWorkflow;
