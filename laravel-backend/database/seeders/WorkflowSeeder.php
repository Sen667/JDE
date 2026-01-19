<?php

namespace Database\Seeders;

use App\Models\WorkflowTemplate;
use App\Models\WorkflowStep;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WorkflowSeeder extends Seeder
{
    /**
     * Seed the workflow tables with complete processes for all worlds.
     */
    public function run(): void
    {
        $this->seedJDEWorkflow();
        $this->seedJDMOWorkflow();
        $this->seedDBCSWorkflow();

        $this->command->info('All workflow templates and steps seeded successfully!');
    }

    private function seedJDEWorkflow()
    {
        // JDE World ID is 1
        $worldId = 1;
        $worldCode = 'JDE';

        $this->createJDEWorkflow($worldId, $worldCode);
    }

    private function seedJDMOWorkflow()
    {
        // JDMO World ID is 2
        $worldId = 2;
        $worldCode = 'JDMO';

        $this->createJDMOWorkflow($worldId, $worldCode);
    }

    private function seedDBCSWorkflow()
    {
        // DBCS World ID is 3
        $worldId = 3;
        $worldCode = 'DBCS';

        $this->createDBCSWorkflow($worldId, $worldCode);
    }

    private function createJDEWorkflow($worldId, $worldCode)
    {
        try {
            // Remove old JDE workflow if exists
            WorkflowTemplate::where('world_id', $worldId)->delete();

            $template = WorkflowTemplate::create([
                'world_id' => $worldId,
                'name' => 'Processus JDE Standard',
                'description' => 'Workflow JDE conforme au processus métier réel avec branches conditionnelles',
                'version' => 1,
                'is_active' => true,
            ]);

            // ============================================
            // NEW JDE WORKFLOW WITH 26 STEPS & BRANCHES
            // ============================================

            // Step 1: Analyse initiale
            $step1 = WorkflowStep::create([
                'workflow_template_id' => $template->id,
                'step_number' => 2,
                'name' => 'Analyse initiale',
                'description' => 'Vérification complétude dossier',
                'step_type' => 'action',
                'requires_decision' => false,
                'is_optional' => false,
                'can_loop_back' => false,
                'parallel_steps' => '[]',
                'conditions' => '[]',
                'form_fields' => '[{"name":"complet","type":"select","label":"Dossier complet ?","options":["Oui","Non"],"required":true},{"name":"priorite","type":"select","label":"Priorité","options":["Normale","Urgente"],"required":true}]',
                'auto_actions' => '[]',
                'metadata' => '{}',
            ]);

            // Step 3: Envoi convention / mandat
             $step2 = WorkflowStep::create([
                'workflow_template_id' => $template->id,
                'step_number' => 3,
                'name' => 'Envoi convention / mandat',
                'description' => 'Envoi du document pour signature',
                'step_type' => 'document',
                'requires_decision' => false,
                'is_optional' => false,
                'can_loop_back' => false,
                'parallel_steps' => '[]',
                'conditions' => '[]',
                'form_fields' => '[{"name":"honoraires_type","type":"radio","label":"Type d\'honoraires","options":[{"value":"tarif_ffb","label":"Vos honoraires HT seront calculés sur le montant des dommages estimés consécutifs au sinistre ci-dessus visé, d\'après le tarif ci après actualisable au dernier indice connu au jour du sinistre par l\'application de l\'indice de la Fédération Française du bâtiment."},{"value":"six_percent","label":"Vos honoraires de 6 % du dommage, en ajoutant la (tva de 20% applicable), avec un montant minimum de 2 500€ HT et hors procédure judiciaire, seront calculés après accord définitif du dossier de chiffrages par la compagnie d\'assurance sur le montant du dommage total ttc."},{"value":"custom_amount","label":"Vos honoraires de _________ TTC comprennent : la visite de reconnaissance du lieux sinistré, le rapport d\'expertise, le rendez vous d\'expertise avec les différents intervenants. ( en cas de chiffrage demandé, cochez la case correspondante ci-dessus au calcul des honoraires)."}],"required":true},{"name":"honoraires_custom_value","type":"text","label":"Montant TTC","required":false,"conditional":"honoraires_type == custom_amount"},{"name":"billing_address","type":"radio","label":"Adresse de facturation","options":["client","sinistre"],"required":true}]',
                'auto_actions' => '[{"type":"generate_document","documentType":"convention"},{"type":"generate_document","documentType":"mandat"}]',
                'metadata' => '{}',
            ]);

            // Step 4: Convention signée ?
            $step3 = WorkflowStep::create([
                'workflow_template_id' => $template->id,
                'step_number' => 4,
                'name' => 'Convention signée ?',
                'description' => 'Réception du document signé',
                'step_type' => 'decision',
                'requires_decision' => true,
                'is_optional' => false,
                'can_loop_back' => false,
                'parallel_steps' => '[]',
                'conditions' => '[]',
                'form_fields' => '[]',
                'auto_actions' => '[]',
                'metadata' => '{}',
            ]);

            // Step 5: Relance convention (SI NON)
            $step4 = WorkflowStep::create([
                'workflow_template_id' => $template->id,
                'step_number' => 5,
                'name' => 'Relance convention',
                'description' => 'Relance client pour signature',
                'step_type' => 'action',
                'requires_decision' => false,
                'is_optional' => false,
                'can_loop_back' => true,
                'parallel_steps' => '[]',
                'conditions' => '[]',
                'form_fields' => '[]',
                'auto_actions' => '[]',
                'metadata' => '{}',
            ]);

            // Step 6: Planification reconnaissance
            $step5 = WorkflowStep::create([
                'workflow_template_id' => $template->id,
                'step_number' => 6,
                'name' => 'Planification reconnaissance',
                'description' => 'Création de rendez-vous pour la reconnaissance terrain',
                'step_type' => 'action',
                'requires_decision' => false,
                'is_optional' => false,
                'can_loop_back' => false,
                'parallel_steps' => '[]',
                'conditions' => '[]',
                'form_fields' => '[]',
                'auto_actions' => '[{"type": "create_appointments", "source_field": "appointments"}]',
                'metadata' => '{"appointment_creation": true, "multiple_appointments": true}',
            ]);

            // Step 7: RDV reconnaissance (PHOTOS TERRAIN)
            $step6 = WorkflowStep::create([
                'workflow_template_id' => $template->id,
                'step_number' => 7,
                'name' => 'Rendez-vous de reconnaissance',
                'description' => 'Visite terrain avec photos, plans et documents',
                'step_type' => 'action',
                'requires_decision' => false,
                'is_optional' => false,
                'can_loop_back' => false,
                'parallel_steps' => '[]',
                'conditions' => '[]',
                'form_fields' => '[]',
                'auto_actions' => '[]',
                'metadata' => '{"field_visit": true, "multiple_file_upload": true}',
            ]);

            // Step 8: Édition courrier mise en cause
            $step7 = WorkflowStep::create([
                'workflow_template_id' => $template->id,
                'step_number' => 8,
                'name' => 'Édition courrier mise en cause',
                'description' => 'Envoi mise en cause assurance',
                'step_type' => 'document',
                'requires_decision' => false,
                'is_optional' => false,
                'can_loop_back' => false,
                'parallel_steps' => '[]',
                'conditions' => '[]',
                'form_fields' => '[]',
                'auto_actions' => '[{"type":"generate_document","documentType":"courrier_mise_en_cause"}]',
                'metadata' => '{}',
            ]);

            // Step 9: Rapport contenu mobilier nécessaire ?
            $step8 = WorkflowStep::create([
                'workflow_template_id' => $template->id,
                'step_number' => 9,
                'name' => 'Rapport contenu mobilier nécessaire ?',
                'description' => 'Déterminer nécessité du rapport',
                'step_type' => 'decision',
                'requires_decision' => true,
                'is_optional' => false,
                'can_loop_back' => false,
                'parallel_steps' => '[]',
                'conditions' => '[]',
                'form_fields' => '[]',
                'auto_actions' => '[]',
                'metadata' => '{}',
            ]);

            // Step 10: Rapport contenu mobilier (OPTIONNEL)
            $step9 = WorkflowStep::create([
                'workflow_template_id' => $template->id,
                'step_number' => 10,
                'name' => 'Rapport contenu mobilier (.xlsx)',
                'description' => 'Upload du rapport mobilier détaillé en format Excel',
                'step_type' => 'action',
                'requires_decision' => false,
                'is_optional' => true,
                'can_loop_back' => false,
                'parallel_steps' => '[]',
                'conditions' => '[]',
                'form_fields' => '[]',
                'auto_actions' => '[]',
                'metadata' => '{"excel_upload": true, "accepted_formats": [".xlsx"]}',
            ]);

           // Step 11: Compagnie assurance renseignée ?
            $step10 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 11,
            'name' => 'Compagnie assurance renseignée ?',
            'description' => 'Vérifier si la compagnie d’assurance est renseignée',
            'step_type' => 'decision',
            'requires_decision' => true,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[]',
            'metadata' => '{}',
        ]);

        // Step 12: Envoi Convention + Mandat à la compagnie
        $step11 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 12,
            'name' => 'Envoi Convention + Mandat à la compagnie',
            'description' => 'Envoi de tous les documents générés à la compagnie',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => true,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[{"type":"send_email","target":"insurance","attachments":"all_generated_documents"}]',
            'metadata' => '{}',
        ]);

        // Step 13: Rendez-vous reconnaissance
        $step12 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 13,
            'name' => 'Rendez-vous reconnaissance',
            'description' => 'Création de rendez-vous pour la reconnaissance terrain',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[{"type": "create_appointments", "source_field": "appointments"}]',
            'metadata' => '{"appointment_creation": true, "multiple_appointments": true}',
        ]);

        // Step 14: Mesures d’urgence requises ?
        $step13 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 14,
            'name' => 'Mesures d’urgence requises ?',
            'description' => 'Déterminer si des mesures d’urgence sont nécessaires',
            'step_type' => 'decision',
            'requires_decision' => true,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[]',
            'metadata' => '{}',
        ]);

        // Step 15: Création document mesures d'urgence
        $step14 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 15,
            'name' => "Document mesures d'urgence",
            'description' => 'Création du document d\'intervention tierce avec observations',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => true,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"reference_assurance","type":"text","label":"Référence Assurance","required":true},{"name":"nom_expert","type":"text","label":"Nom de l\'expert","required":true},{"name":"nature_travaux","type":"textarea","label":"Nature de travaux","required":true},{"name":"entreprise_intervention","type":"text","label":"Nom de l\'entreprise d\'intervention","required":true},{"name":"observations","type":"textarea","label":"Observations","required":true}]',
            'auto_actions' => '[{"type":"generate_document","documentType":"mesures_urgence"}]',
            'metadata' => '{}',
        ]);

        // Step 16: État des Pertes (EDP) - Excel file upload (like Step 10)
        $step15 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 16,
            'name' => 'État des Pertes (EDP) (.xlsx)',
            'description' => 'Upload de l\'état des pertes détaillé en format Excel',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[]',
            'metadata' => '{"excel_upload": true, "accepted_formats": [".xlsx"]}',
        ]);

        // Step 17: RCCI convoqué par compagnie ?
        $step16 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 17,
            'name' => 'RCCI convoqué par la compagnie ?',
            'description' => 'Vérifier si un RCCI est demandé',
            'step_type' => 'decision',
            'requires_decision' => true,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[]',
            'metadata' => '{}',
        ]);

        // Step 18: Enregistrement RDV RCCI
          $step17 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 18,
            'name' => 'Enregistrement RDV RCCI',
            'description' => 'Enregistrement du RDV RCCI dans le CRM avec possibilité d\'upload de documents et création de tâches',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => true,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[{"type":"create_appointment","category":"RCCI"}]',
            'metadata' => '{"status_tracking":["planifié","effectué","annulé"],"document_upload":true,"accepted_formats":["*"],"task_creation_button":true}',
        ]);

        // Step 19: Lancement études techniques (DAAT / RAAT)
        $step18 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 19,
            'name' => 'Lancement études techniques (DAAT / RAAT)',
            'description' => 'Upload des documents techniques extérieurs',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '["DAAT","RAAT"]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[]',
            'metadata' => '{"external_documents": true, "document_upload": true, "accepted_formats": ["*"]}',
        ]);

        // Step 20: Chiffrage des dommages (Excel)
        $step19 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 20,
            'name' => 'Chiffrage des dommages',
            'description' => 'Upload du chiffrage des dommages (.xlsx)',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[]',
            'metadata' => '{"excel_upload": true}',
        ]);

        // Step 21: Prise de contact pour RDV pointage chiffrage
        $step20 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 21,
            'name' => 'Prise de contact RDV pointage chiffrage',
            'description' => 'Contact avec expert assurance',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[]',
            'metadata' => '{}',
        ]);

        // Step 22: Email propositions de dates
        $step21 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 22,
            'name' => 'Email propositions de dates',
            'description' => 'Envoi email à l’expert assurance',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[{"type":"send_email","target":"insurance_expert"}]',
            'metadata' => '{}',
        ]);

        // Step 23: RDV pointage chiffrage
         $step22 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 23,
            'name' => 'RDV pointage chiffrage',
            'description' => 'Création du RDV de pointage chiffrage',
            'step_type' => 'meeting',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[{"type":"create_appointment","category":"pointage_chiffrage"}]',
            'metadata' => '{}',
        ]);

        // Step 24: Réception PV des dommages (audio)
         $step23 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 24,
            'name' => 'Réception procès-verbal des dommages',
            'description' => 'Upload audio du PV des dommages',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[]',
            'metadata' => '{"audio_upload": true}',
        ]);

        // Step 25: Génération facture RDV de clôture
        $step24 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 25,
            'name' => 'Génération facture RDV de clôture',
            'description' => 'Génération automatique de la facture pour le rendez-vous de clôture',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name": "montant_facture", "type": "number", "label": "Montant de la facture (€)", "required": true}, {"name": "description_services", "type": "textarea", "label": "Description des services", "required": true}]',
            'auto_actions' => '[{"type": "generate_document", "documentType": "facture_cloture"}]',
            'metadata' => '{}',
        ]);

        // Step 26: RDV de clôture
        $step25 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 26,
            'name' => 'RDV de clôture',
            'description' => 'Création du rendez-vous de clôture du dossier',
            'step_type' => 'meeting',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'auto_actions' => '[{"type": "create_appointment", "category": "cloture"}]',
            'metadata' => '{"appointment_creation": true}',
        ]);

        // Step 27: Clôture du dossier sinistre
        $step26 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 27,
            'name' => 'Clôture du dossier sinistre',
            'description' => 'Finalisation et archivage définitif du dossier',
            'step_type' => 'milestone',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'parallel_steps' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name": "confirmation_cloture", "type": "boolean", "label": "Confirmer la clôture définitive", "required": true}, {"name": "notes_cloture", "type": "textarea", "label": "Notes de clôture"}]',
            'auto_actions' => '[{"type": "close_dossier", "status": "terminer"}]',
            'metadata' => '{"closes_dossier": true}',
        ]);

            // ============================================
            // LINKS / BRANCHES
            // ============================================


            $step1->update(['next_step_id' => $step2->id]);
            $step2->update(['next_step_id' => $step3->id]);

            // Step 3(Convention signée ?)
            // YES -> Planification reconnaissance (Step 6)
            // NO  -> Relance convention (Step 5)
            $step3->update([
                'decision_yes_next_step_id' => $step5->id,
                'decision_no_next_step_id'  => $step4->id
            ]);

            // Step 4 (Relance) -> Back to decision Convention signée
            $step4->update(['next_step_id' => $step3->id]);

            $step5->update(['next_step_id' => $step6->id]);
            $step6->update(['next_step_id' => $step7->id]);
            $step7->update(['next_step_id' => $step8->id]);

            // Step 8 (Rapport mobilier nécessaire ?)
            // YES -> Upload rapport mobilier (Step 10)
            // NO  -> Compagnie assurance ? (Step 11)
            $step8->update([
                'decision_yes_next_step_id' => $step9->id,
                'decision_no_next_step_id'  => $step10->id
            ]);

            // Step 9 -> Step 10
            $step9->update(['next_step_id' => $step10->id]);

            // Step 10 (Compagnie renseignée ?)
            // YES -> Envoi documents compagnie (Step 12)
            // NO  -> RDV reconnaissance (Step 13)
            $step10->update([
                'decision_yes_next_step_id' => $step11->id,
                'decision_no_next_step_id'  => $step12->id
            ]);
            $step11->update(['next_step_id' => $step12->id]);

            $step12->update(['next_step_id' => $step13->id]);

            // Step 13 (Mesures urgence ?)
            // YES -> Document urgence (Step 15)
            // NO  -> EDP Excel (Step 16)
            $step13->update([
                'decision_yes_next_step_id' => $step14->id,
                'decision_no_next_step_id'  => $step15->id
            ]);

            $step14->update(['next_step_id' => $step15->id]);

            $step15->update(['next_step_id' => $step16->id]);

            // Step 16 (RCCI convoqué ?)
            // YES -> Enregistrement RCCI (Step 18)
            // NO  -> Études techniques (Step 19)
            $step16->update([
                'decision_yes_next_step_id' => $step17->id,
                'decision_no_next_step_id'  => $step18->id
            ]);

            $step17->update(['next_step_id' => $step18->id]);

            $step18->update(['next_step_id' => $step19->id]);
            $step19->update(['next_step_id' => $step20->id]);
            $step20->update(['next_step_id' => $step21->id]);
            $step21->update(['next_step_id' => $step22->id]);
            $step22->update(['next_step_id' => $step23->id]);
            $step23->update(['next_step_id' => $step24->id]);
            $step24->update(['next_step_id' => $step25->id]);
            $step25->update(['next_step_id' => $step26->id]);

            // Step 27 (Clôture) => FINAL STEP (NO NEXT)
            $step26->update(['next_step_id' => null]);


            $this->command->info("{$worldCode} workflow updated with 26 steps, 4 decision branches, and proper step ordering");
        } catch (\Exception $e) {
            $this->command->error("Failed to create {$worldCode} workflow: " . $e->getMessage());
            throw $e;
        }
    }

    private function createJDMOWorkflow($worldId, $worldCode)
{
    try {
        WorkflowTemplate::where('world_id', $worldId)->delete();

        $template = WorkflowTemplate::create([
            'world_id' => $worldId,
            'name' => 'Workflow JDMO Complet',
            'description' => 'Workflow de maîtrise d\'œuvre avec branchement après bilan de visite',
            'version' => 1,
            'is_active' => true,
        ]);

        // =========================================================
        // Step 1: Création Client JDMO
        // =========================================================
        $step1 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 1,
            'name' => 'Création Client',
            'description' => 'Saisie des informations du client maître d\'œuvre',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type": "create_notification", "message": "Nouveau client JDMO créé"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"client_type","type":"select","label":"Type de client","options":[{"value":"locataire","label":"Locataire"},{"value":"proprietaire","label":"Propriétaire"},{"value":"proprietaire_non_occupant","label":"Propriétaire non occupant"},{"value":"professionnel","label":"Professionnel"}],"required":true},{"name":"nom","type":"text","label":"Nom","required":true},{"name":"prenom","type":"text","label":"Prénom","required":true},{"name":"nom_societe","type":"text","label":"NOM - PRENOM OU NOM DE LA SOCIETE","required":false},{"name":"adresse_client","type":"textarea","label":"Adresse client","required":false},{"name":"adresse_facturation","type":"textarea","label":"ADRESSE DE FACTURATION SINISTRE","required":false},{"name":"adresse_realisation_missions","type":"textarea","label":"ADRESSE DE REALISATION DE MISSIONS MO","required":false},{"name":"telephone","type":"tel","label":"TEL","required":false},{"name":"email","type":"email","label":"Mail","required":false},{"name":"travaux_suite_sinistre","type":"radio","label":"MO SUITE A SINISTRE","options":[{"value":"oui","label":"OUI"},{"value":"non","label":"NON"}],"required":false},{"name":"type_proprietaire","type":"radio","label":"Type de propriétaire","options":[{"value":"proprietaire","label":"Propriétaire"},{"value":"proprietaire_non_occupant","label":"Propriétaire non occupant"},{"value":"exploitant","label":"Exploitant"}],"required":false},{"name":"origine_dossier","type":"radio","label":"ORIGINE DU DOSSIER","options":[{"value":"jde","label":"JDE"},{"value":"nle","label":"NLE"},{"value":"autres","label":"AUTRES"}],"required":false},{"name":"numero_dossier_jde","type":"text","label":"Numéro de dossier si JDE","required":false,"conditional":"origine_dossier == jde"},{"name":"references_devis_travaux","type":"textarea","label":"REFERENCES DEVIS TRAVAUX","required":false},{"name":"nature_travaux","type":"radio","label":"NATURE DES TRAVAUX","options":[{"value":"renovation","label":"RENOVATION"},{"value":"reconstruction","label":"RECONSTRUCTION"}],"required":false},{"name":"numero_permis_construire","type":"text","label":"Si reconstruction PERMIS DE CONSTRUIRE N°","required":false,"conditional":"nature_travaux == reconstruction"},{"name":"numero_declaration_prealable","type":"text","label":"Si rénovation DECLARATION PREALABLE DE TRAVAUX N°","required":false,"conditional":"nature_travaux == renovation"},{"name":"modification_plan","type":"radio","label":"MODIFICATION DE PLAN","options":[{"value":"oui","label":"OUI"},{"value":"non","label":"NON"}],"required":false},{"name":"proprietaire_nom","type":"text","label":"Nom du propriétaire","required":false,"conditional":"client_type == locataire"},{"name":"proprietaire_prenom","type":"text","label":"Prénom du propriétaire","required":false,"conditional":"client_type == locataire"},{"name":"proprietaire_telephone","type":"tel","label":"Téléphone du propriétaire","required":false,"conditional":"client_type == locataire"},{"name":"proprietaire_email","type":"email","label":"Email du propriétaire","required":false,"conditional":"client_type == locataire"},{"name":"proprietaire_adresse","type":"textarea","label":"Adresse du propriétaire","required":false,"conditional":"client_type == locataire"}]',
            'metadata' => '{}',
        ]);



        // =========================================================
        // Step 2: Envoi contrat maîtrise d'œuvre
        // =========================================================
        $step2 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 2,
            'name' => 'Envoi contrat maîtrise d\'œuvre',
            'description' => 'Génération et envoi automatique du contrat avec signature électronique',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"generate_document","documentType":"contrat_maitrise_oeuvre"},{"type":"send_email","to":"client","subject":"Contrat de maîtrise d\'œuvre","with_signature_link":true}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"montant_honoraires","type":"number","label":"Montant des honoraires (€)","required":true}]',
            'metadata' => '{}',
        ]);

        // =========================================================
        // Step 3: Réalisation des plans
        // =========================================================
        $step3 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 3,
            'name' => 'Réalisation des plans',
            'description' => 'Upload des plans techniques, photos et croquis du chantier',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"documents","type":"array","label":"Documents à uploader","item_template":{"type_document":{"name":"type_document","type":"select","label":"Type de document","options":["Plan architectural","Plan technique","Photo","Croquis"],"required":true},"fichiers":{"name":"fichiers","type":"file","label":"Fichiers","multiple":true,"required":true},"description":{"name":"description","type":"textarea","label":"Description"}}}]',
            'metadata' => '{}',
        ]);

        // =========================================================
        // Step 4: Préparation documents administratifs
        // =========================================================
        $step4 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 4,
            'name' => 'Préparation documents administratifs',
            'description' => 'Rassemblement et vérification des documents nécessaires',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"documents_prepares","type":"checkbox","label":"Documents à préparer","options":["Déclaration de travaux","Permis de construire"],"required":true},{"name":"observations","type":"textarea","label":"Observations"}]',
            'metadata' => '{}',
        ]);

        // =========================================================
        // Step 5: Déclaration de travaux / Permis
        // =========================================================
        $step5 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 5,
            'name' => 'Déclaration de travaux / Permis de construire',
            'description' => 'Dépôt et suivi de la déclaration ou du permis',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"type_autorisation","type":"select","label":"Type d\'autorisation","options":["Déclaration préalable","Permis de construire","Pas d\'autorisation nécessaire"],"required":true},{"name":"numero_dossier","type":"text","label":"Numéro de dossier"},{"name":"date_depot","type":"date","label":"Date de dépôt","required":true},{"name":"statut","type":"select","label":"Statut","options":["Déposé","En instruction","Accordé","Refusé"],"required":true}]',
            'metadata' => '{}',
        ]);

        // =========================================================
        // Step 6: Import documents obligatoires (OPTION B)
        // =========================================================
        $step6 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 6,
            'name' => 'Import documents obligatoires',
            'description' => 'Upload des documents réglementaires, assurances et autorisations administratives',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[
              {
                "name":"documents_importes",
                "type":"checkbox",
                "label":"Documents à importer",
                "options":[
                  "Attestation RC Pro",
                  "Garantie décennale",
                  "Déclaration de travaux",
                  "Permis de construire",
                  "Autres autorisations",
                  "PV de réunion"
                ],
                "required":true
              },
              {
                "name":"details_autres_autorisations",
                "type":"textarea",
                "label":"Détails (si Autres autorisations)",
                "conditional":"documents_importes.includes(\"Autres autorisations\")",
                "required":false
              },
              {
                "name":"attestation_rc_pro_files",
                "type":"file",
                "label":"Fichiers Attestation RC Pro",
                "conditional":"documents_importes.includes(\"Attestation RC Pro\")",
                "multiple":true,
                "accept":"*/*",
                "required":false
              },
              {
                "name":"garantie_decennale_files",
                "type":"file",
                "label":"Fichiers Garantie décennale",
                "conditional":"documents_importes.includes(\"Garantie décennale\")",
                "multiple":true,
                "accept":"*/*",
                "required":false
              },
              {
                "name":"declaration_travaux_files",
                "type":"file",
                "label":"Fichiers Déclaration de travaux",
                "conditional":"documents_importes.includes(\"Déclaration de travaux\")",
                "multiple":true,
                "accept":"*/*",
                "required":false
              },
              {
                "name":"permis_construire_files",
                "type":"file",
                "label":"Fichiers Permis de construire",
                "conditional":"documents_importes.includes(\"Permis de construire\")",
                "multiple":true,
                "accept":"*/*",
                "required":false
              },
              {
                "name":"autres_autorisations_files",
                "type":"file",
                "label":"Fichiers Autres autorisations",
                "conditional":"documents_importes.includes(\"Autres autorisations\")",
                "multiple":true,
                "accept":"*/*",
                "required":false
              },
              {
                "name":"pv_reunion_files",
                "type":"file",
                "label":"Fichiers PV de réunion",
                "conditional":"documents_importes.includes(\"PV de réunion\")",
                "multiple":true,
                "accept":"*/*",
                "required":false
              }
            ]',
            'metadata' => '{}',
        ]);


        // =========================================================
        // Step 7: Visite de pré-réception
        // =========================================================
        $step7 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 7,
            'name' => 'Visite de pré-réception',
            'description' => 'Inspection du chantier avant réception définitive',
            'step_type' => 'meeting',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"create_appointment","category":"visite_pre_reception"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"appointment_title","type":"text","label":"Titre du rendez-vous","required":true,"default":"Visite de pré-réception"},{"name":"appointment_date","type":"datetime","label":"Date et heure du rendez-vous","required":true},{"name":"appointment_description","type":"textarea","label":"Description/Notes","required":false},{"name":"appointment_participants","type":"textarea","label":"Participants","required":false}]',
            'metadata' => '{"status_tracking":["planifié","effectué","annulé"],"document_upload":true,"accepted_formats":["*"],"task_creation_button":true}',
        ]);


        // =========================================================
        // Step 8: DECISION - Bilan de la visite
        // =========================================================
        $step8 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 8,
            'name' => 'Bilan de la visite de pré-réception',
            'description' => 'Décision: Le bilan de la visite est-il satisfaisant ?',
            'step_type' => 'decision',
            'requires_decision' => true,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'metadata' => '{}',
        ]);

        // =========================================================
        // YES branch
        // Step 9: Génération liste des réserves
        // =========================================================
        $step9 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 9,
            'name' => 'Génération liste des réserves',
            'description' => 'Génération automatique de la liste des réserves',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"generate_document","documentType":"liste_reserves"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"adresse_chantier","type":"text","label":"Adresse chantier","required":true},{"name":"date","type":"date","label":"Date","required":true},{"name":"lieu","type":"text","label":"Lieu","required":true},{"name":"reservations","type":"array","label":"Liste des réserves","item_template":{"reservation":{"name":"reservation","type":"text","label":"Réserve","required":true}}}]',
            'metadata' => '{}',
        ]);

        // Step 10: Signature liste des réserves
        $step10 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 10,
            'name' => 'Signature liste des réserves',
            'description' => 'Envoi au client pour signature électronique de la liste des réserves',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"send_email","to":"client","subject":"Liste des réserves à signer","with_signature_link":true}]',
            'conditions' => '[]',
            'form_fields' => '[]',
            'metadata' => '{}',
        ]);

        // =========================================================
        // NO branch
        // Step 11: Envoi automatique vers DBCS in this step use the transfer dossier methode
        // =========================================================
        $step11 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 11,
            'name' => 'Envoi automatique vers DBCS',
            'description' => 'Transfert automatique du dossier vers DBCS',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"transfer_document","to":"DBCS"},{"type":"create_notification","message":"Dossier envoyé vers DBCS (bilan non satisfaisant)"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"motif_envoi_dbcs","type":"textarea","label":"Motif de l\'envoi vers DBCS","required":true}]',
            'metadata' => '{}',
        ]);

         // =========================================================
        // Step 12: Génération PV de réception
        // =========================================================
        $step12 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 12,
            'name' => 'Génération automatique PV de réception',
            'description' => 'Création du procès-verbal de réception des travaux',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"generate_document","documentType":"pv_reception"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"reception_type","type":"radio","label":"Type de réception","options":[{"value":"avec_reserves","label":"Avec réserves"},{"value":"sans_reserves","label":"Sans réserves"}],"required":true}]',
            'metadata' => '{}',
        ]);

        // =========================================================
        // Step 13: Signature sur place ou en ligne (COMMON)
        // =========================================================
        $step13 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 13,
            'name' => 'Signature sur place ou en ligne',
            'description' => 'Signature du document final par toutes les parties',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"send_email","to":"all_parties","subject":"Document signé"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"mode_signature","type":"select","label":"Mode de signature","options":["Sur place","En ligne"],"required":true},{"name":"date_signature","type":"datetime","label":"Date de signature","required":true},{"name":"signataires","type":"textarea","label":"Liste des signataires","required":true}]',
            'metadata' => '{}',
        ]);

    // =========================================================
    // Step 14: Clôture du dossier (FINAL STEP)
    // =========================================================
    $step14 = WorkflowStep::create([
        'workflow_template_id' => $template->id,
        'step_number' => 14,
        'name' => 'Clôture du dossier',
        'description' => 'Clôture administrative du dossier chantier',
        'step_type' => 'action',
        'requires_decision' => false,
        'is_optional' => false,
        'can_loop_back' => false,
        'next_step_id' => null,
        'parallel_steps' => '[]',
        'auto_actions' => '[
            {
                "type": "update_dossier_status",
                "status": "cloturee"
            },
            {
                "type": "create_notification",
                "message": "Le dossier a été clôturé"
            }
        ]',
        'conditions' => '[]',
        'form_fields' => '[
            {
                "name": "commentaire_cloture",
                "type": "textarea",
                "label": "Commentaire de clôture",
                "required": false
            }
        ]',
        'metadata' => '{}',
    ]);

            // =========================================================
            // UPDATE RELATIONSHIPS
            // =========================================================

            // Linear chain: 1→2→3→4→5→6→7→8
        $step1->update(['next_step_id' => $step2->id]);
    $step2->update(['next_step_id' => $step3->id]);
    $step3->update(['next_step_id' => $step4->id]);
    $step4->update(['next_step_id' => $step5->id]);
    $step5->update(['next_step_id' => $step6->id]);
    $step6->update(['next_step_id' => $step7->id]);
    $step7->update(['next_step_id' => $step8->id]);

    // Decision (bilan visite)
    $step8->update([
        'decision_yes_next_step_id' => $step9->id,
        'decision_no_next_step_id'  => $step11->id,
    ]);

    // YES flow
    $step9->update(['next_step_id' => $step10->id]);
    $step10->update(['next_step_id' => $step13->id]);

    // NO flow
    $step11->update(['next_step_id' => $step12->id]);
    $step12->update(['next_step_id' => $step13->id]);

    // Common end
    $step13->update(['next_step_id' => $step14->id]);
            $this->command->info("{$worldCode} workflow created with 14 steps + final archive (15). Branching after bilan: YES(9-10-13) / NO(11-12-13).");
        } catch (\Exception $e) {
            $this->command->error("Failed to create {$worldCode} workflow: " . $e->getMessage());
            throw $e;
        }
}


   private function createDBCSWorkflow($worldId, $worldCode)
{
    try {
        $template = WorkflowTemplate::create([
            'world_id' => $worldId,
            'name' => 'Workflow DBCS - Gestion Chantier (Référence PDF)',
            'description' => 'Workflow conforme au PDF DBCS : décisions, boucles, notifications et convergences',
            'version' => 1,
            'is_active' => true,
        ]);

        // ==========================================================
        // WORKFLOW CONFORME PDF (clean) - étape "validation RDV" supprimée
        // ==========================================================

        // 1) Création directe du client
        $step1 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 1,
            'name' => 'Création directe du client',
            'description' => 'Saisie des informations du client (possible sans JDE ni JDMO)',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"create_notification","message":"Client créé (workflow DBCS)"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"nom_societe","type":"text","label":"NOM - PRENOM OU NOM DE LA SOCIETE","required":false},{"name":"adresse_facturation","type":"textarea","label":"ADRESSE DE FACTURATION SINISTRE","required":false},{"name":"adresse_realisation_travaux","type":"textarea","label":"ADRESSE DE REALISATION DES TRAVAUX","required":false},{"name":"telephone","type":"tel","label":"TEL","required":false},{"name":"travaux_suite_sinistre","type":"radio","label":"TRAVAUX SUITE A SINISTRE","options":[{"value":"oui","label":"OUI"},{"value":"non","label":"NON"}],"required":false},{"name":"email","type":"email","label":"Mail","required":false},{"name":"type_proprietaire","type":"radio","label":"Type de propriétaire","options":[{"value":"proprietaire","label":"Propriétaire"},{"value":"proprietaire_non_occupant","label":"Propriétaire non occupant"},{"value":"exploitant","label":"Exploitant"}],"required":false},{"name":"origine_dossier","type":"radio","label":"ORIGINE DU DOSSIER","options":[{"value":"jde","label":"JDE"},{"value":"nle","label":"NLE"},{"value":"autres","label":"AUTRES"}],"required":false},{"name":"numero_dossier_jde","type":"text","label":"Numéro de dossier si JDE","required":false,"conditional":"origine_dossier == jde"},{"name":"references_devis_travaux","type":"textarea","label":"REFERENCES DEVIS TRAVAUX","required":false},{"name":"nature_travaux","type":"radio","label":"NATURE DES TRAVAUX","options":[{"value":"renovation","label":"RENOVATION"},{"value":"reconstruction","label":"RECONSTRUCTION"}],"required":false},{"name":"numero_permis_construire","type":"text","label":"Si reconstruction PERMIS DE CONSTRUIRE N°","required":false,"conditional":"nature_travaux == reconstruction"},{"name":"numero_declaration_prealable","type":"text","label":"Si rénovation DECLARATION PREALABLE DE TRAVAUX N°","required":false,"conditional":"nature_travaux == renovation"},{"name":"branchement_provisoire","type":"radio","label":"BRANCHEMENT PROVISOIRE","options":[{"value":"oui","label":"OUI"},{"value":"non","label":"NON"}],"required":false},{"name":"occupation_voirie","type":"radio","label":"OCCUPATION DE VOIRIE","options":[{"value":"oui","label":"OUI"},{"value":"non","label":"NON"}],"required":false}]',
            'metadata' => '{}',
        ]);

        // 2) Création EDP en Devis
        $step2 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 2,
            'name' => 'Upload EDP (.xlsx)',
            'description' => 'Upload du fichier EDP en format Excel (.xlsx)',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"fichier_edp","type":"file","label":"Fichier EDP (.xlsx)","accept":".xlsx","required":true}]',
            'metadata' => '{"excel_upload": true, "accepted_formats": [".xlsx"]}',
        ]);

        // 3) RDV technique
        $step3 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 3,
            'name' => 'Rendez-vous technique',
            'description' => 'Visite technique : devis/EDP confirmé + obtention chèque d’acompte',
            'step_type' => 'meeting',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"date_rdv","type":"date","label":"Date du RDV","required":true},{"name":"heure_rdv","type":"time","label":"Heure du RDV","required":true},{"name":"devis_confirme","type":"boolean","label":"Devis/EDP confirmé","required":true},{"name":"acompte_obtenu","type":"boolean","label":"Chèque d’acompte obtenu","required":false},{"name":"montant_acompte","type":"number","label":"Montant acompte (€)"}]',
            'metadata' => '{}',
        ]);

        // 4) Protocole + lettre d’engagement (optionnel)
        $step4 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 4,
            'name' => 'Protocole d’accord + lettre d’engagement',
            'description' => 'Optionnel : si entreprise autre que DBCS',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => true,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"entreprise_autre_que_dbcs","type":"boolean","label":"Entreprise autre que DBCS ?"},{"name":"protocole_signe","type":"boolean","label":"Protocole signé","conditional":"entreprise_autre_que_dbcs == true"},{"name":"lettre_engagement_signee","type":"boolean","label":"Lettre d’engagement signée","conditional":"entreprise_autre_que_dbcs == true"},{"name":"document_protocole","type":"file","label":"Document protocole","accept":"*/*","required":false,"conditional":"protocole_signe == true"},{"name":"document_lettre_engagement","type":"file","label":"Document lettre d’engagement","accept":"*/*","required":false,"conditional":"lettre_engagement_signee == true"}]',
            'metadata' => '{}',
        ]);

        // 5) Demande occupation du sol
        $step5 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 5,
            'name' => 'Gestion demande d’occupation du sol',
            'description' => 'Préparer la demande d’occupation du sol auprès de la mairie',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"create_notification","title":"Occupation du sol","message":"Demande d’occupation du sol en préparation/envoi"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"date_demande","type":"date","label":"Date de la demande","required":true},{"name":"mairie","type":"text","label":"Mairie concernée","required":true},{"name":"surface_occupation","type":"number","label":"Surface d’occupation (m²)","required":true}]',
            'metadata' => '{}',
        ]);

        // 6) Génération demande + suivi (email mairie)
        $step6 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 6,
            'name' => 'Génération de la demande + suivi',
            'description' => 'Génération + suivi (email mairie / formulaire externe)',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"send_email","recipient":"mairie","subject":"Demande d’occupation du sol","template":"occupation_sol_demande"},{"type":"create_notification","title":"Suivi mairie","message":"Suivi demande occupation du sol à effectuer (CRM)"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"numero_demande","type":"text","label":"Numéro de demande","required":true},{"name":"statut_suivi","type":"select","label":"Statut du suivi","options":["En attente","En cours","Accordé","Refusé"],"required":true}]',
            'metadata' => '{}',
        ]);

        // 7) Décision : Arrêté obtenu ?
        $step7 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 7,
            'name' => 'Décision : Arrêté municipal obtenu ?',
            'description' => 'Vérifier si l’arrêté municipal a été obtenu',
            'step_type' => 'decision',
            'requires_decision' => true,
            'is_optional' => false,
            'can_loop_back' => true,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"arrete_obtenu","type":"boolean","label":"Arrêté obtenu","required":true},{"name":"numero_arrete","type":"text","label":"Numéro d’arrêté"},{"name":"date_obtention","type":"date","label":"Date d’obtention"}]',
            'metadata' => '{}',
        ]);

        // 8) Enregistrement arrêté (n° + date fin)
        $step8 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 8,
            'name' => 'Enregistrement n° arrêté + date de fin',
            'description' => 'Saisir le numéro d’arrêté et la date de fin',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => true,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"create_notification","title":"Arrêté enregistré","message":"Arrêté municipal enregistré (n° + date de fin)"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"numero_arrete","type":"text","label":"Numéro d’arrêté","required":true},{"name":"date_fin","type":"date","label":"Date de fin de validité","required":true},{"name":"document_arrete","type":"file","label":"Document arrêté","accept":"*/*","required":false}]',
            'metadata' => '{}',
        ]);

        // 9) Transmission arrêté aux chefs d’équipe
        $step9 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 9,
            'name' => 'Transmission arrêté aux chefs d’équipe',
            'description' => 'Diffuser l’arrêté municipal aux chefs d’équipe',
            'step_type' => 'notification',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"send_email","recipient":"chefs_equipes","subject":"Arrêté municipal - informations chantier","template":"arrete_transmission"},{"type":"create_notification","title":"Arrêté diffusé","message":"Arrêté municipal transmis aux chefs d’équipe"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"diffusion_ok","type":"boolean","label":"Transmission effectuée","required":true},{"name":"destinataires","type":"textarea","label":"Destinataires (liste)"}]',
            'metadata' => '{}',
        ]);

        // 10) Décision : Travaux finis ?
        $step10 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 10,
            'name' => 'Décision : Travaux finis ?',
            'description' => 'Vérifier si les travaux sont terminés avant expiration',
            'step_type' => 'decision',
            'requires_decision' => true,
            'is_optional' => false,
            'can_loop_back' => true,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"travaux_finis","type":"boolean","label":"Travaux terminés","required":true},{"name":"date_fin_reelle","type":"date","label":"Date de fin réelle"}]',
            'metadata' => '{}',
        ]);

        // 11) Notification auto J-15 expiration
        $step11 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 11,
            'name' => 'Notification auto J-15 avant expiration',
            'description' => 'Rappel automatique 15 jours avant la fin de validité de l’arrêté (si chantier non terminé)',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"create_notification","title":"Rappel J-15 (arrêté)","message":"Chantier non terminé : lancer une demande de prolongation / renouvellement","schedule":"date_minus_15_days"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"date_fin_arrete","type":"date","label":"Date fin arrêté (rappel)","required":true}]',
            'metadata' => '{}',
        ]);

        // 12) Demande de prolongation
        $step12 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 12,
            'name' => 'Demande de prolongation',
            'description' => 'Upload du document de prolongation/renouvellement arrêté',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => true,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"send_email","recipient":"mairie","subject":"Demande de prolongation / renouvellement arrêté","template":"arrete_prolongation"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"document_prolongation","type":"file","label":"Document de prolongation/renouvellement","accept":"*/*","required":true}]',
            'metadata' => '{}',
        ]);

        // 13) Alerte “Arrêté en attente” CRM
        $step13 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 13,
            'name' => 'Alerte “Arrêté en attente” dans CRM',
            'description' => 'Créer une alerte interne tant que l’arrêté n’est pas obtenu',
            'step_type' => 'notification',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"create_notification","title":"Arrêté en attente","message":"Arrêté municipal non obtenu : suivi mairie à relancer (CRM)"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"commentaire_relance","type":"textarea","label":"Commentaire / relance mairie"}]',
            'metadata' => '{}',
        ]);

        // 14) Demande de compteur
        $step14 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 14,
            'name' => 'Demande de compteur',
            'description' => 'Demande d’ouverture/compteur électrique provisoire',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => true,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"type_compteur","type":"select","label":"Type de compteur","options":["Monophasé","Triphasé"],"required":true},{"name":"puissance","type":"number","label":"Puissance (kVA)","required":true},{"name":"fournisseur","type":"text","label":"Fournisseur","required":true},{"name":"numero_demande_compteur","type":"text","label":"N° demande compteur","required":false}]',
            'metadata' => '{}',
        ]);

        // 15) Décision : Date RDV compteur reçue ?
        $step15 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 15,
            'name' => 'Décision : Date RDV compteur reçue ?',
            'description' => 'Vérifier si la date de RDV compteur est reçue',
            'step_type' => 'decision',
            'requires_decision' => true,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"date_rdv_recue","type":"boolean","label":"Date RDV compteur reçue ?","required":true},{"name":"document_rdv_compteur","type":"file","label":"Document RDV compteur","accept":"*/*","required":false,"conditional":"date_rdv_recue == true"}]',
            'metadata' => '{}',
        ]);

        // 16) Création tâche chef d’équipe (présence RDV) - seulement si OUI
        $step16 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 16,
            'name' => 'Création tâche chef d’équipe (présence RDV)',
            'description' => 'Créer la tâche : chef d’équipe présent au RDV compteur',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"create_task","assignedTo":"chef_equipe","title":"Présence RDV compteur","priority":"high"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"chef_equipe","type":"text","label":"Chef d’équipe assigné","required":true},{"name":"notes_rdv","type":"textarea","label":"Notes RDV compteur"}]',
            'metadata' => '{}',
        ]);

        // 17) Tâches logistiques
        $step17 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 17,
            'name' => 'Tâches logistiques',
            'description' => 'Logistique : location bennes, WC, matériel, suivi statuts CRM',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"bennes_ok","type":"boolean","label":"Location bennes OK","required":true},{"name":"wc_ok","type":"boolean","label":"WC OK","required":true},{"name":"materiel_ok","type":"boolean","label":"Matériel OK","required":true},{"name":"suivi_statuts_crm","type":"boolean","label":"Suivi statuts CRM OK","required":false},{"name":"liste_materiel","type":"textarea","label":"Liste matériel"}]',
            'metadata' => '{}',
        ]);

        // 18) Démarrage chantier
        $step18 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 18,
            'name' => 'Démarrage chantier',
            'description' => 'Démarrage officiel du chantier',
            'step_type' => 'milestone',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"create_notification","title":"Chantier démarré","message":"Le chantier a démarré"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"date_demarrage","type":"date","label":"Date de démarrage","required":true},{"name":"equipe_presente","type":"text","label":"Équipe présente","required":true},{"name":"photo_debut","type":"text","label":"Photo de début"}]',
            'metadata' => '{}',
        ]);

        // 19) Décision : Chantier fini ?
        $step19 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 19,
            'name' => 'Décision : Chantier fini ?',
            'description' => 'Vérifier si le chantier est terminé',
            'step_type' => 'decision',
            'requires_decision' => true,
            'is_optional' => false,
            'can_loop_back' => true,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"chantier_fini","type":"boolean","label":"Chantier fini ?","required":true}]',
            'metadata' => '{}',
        ]);

        // 20) Demande Consuel
        $step20 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 20,
            'name' => 'Demande Consuel (attestation conformité)',
            'description' => 'Demande d’attestation Consuel',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => true,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"type_installation","type":"select","label":"Type d’installation","options":["Neuf","Rénovation"],"required":true},{"name":"numero_demande_consuel","type":"text","label":"Numéro de demande","required":true},{"name":"date_demande","type":"date","label":"Date de la demande","required":true}]',
            'metadata' => '{}',
        ]);

        // 21) Décision : Attestation reçue ?
        $step21 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 21,
            'name' => 'Décision : Attestation reçue ?',
            'description' => 'Vérifier si l’attestation Consuel a été reçue',
            'step_type' => 'decision',
            'requires_decision' => true,
            'is_optional' => false,
            'can_loop_back' => true,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"attestation_recue","type":"boolean","label":"Attestation reçue","required":true},{"name":"numero_attestation","type":"text","label":"Numéro d’attestation","conditional":"attestation_recue == true"},{"name":"document_consuel","type":"file","label":"Document Consuel","accept":"*/*","required":false,"conditional":"attestation_recue == true"}]',
            'metadata' => '{}',
        ]);

        // 22) Envoi auto au client
        $step22 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 22,
            'name' => 'Envoi auto au client',
            'description' => 'Envoi automatique de l’attestation Consuel au client',
            'step_type' => 'notification',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"send_email","recipient":"client","subject":"Attestation Consuel","template":"consuel","attachments":["consuel_document"]}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"email_envoye","type":"boolean","label":"Email envoyé"},{"name":"date_envoi","type":"date","label":"Date d’envoi"}]',
            'metadata' => '{}',
        ]);

        // 23) Décision : JDMO existe ?
        $step23 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 23,
            'name' => 'Décision : JDMO existe ?',
            'description' => 'Vérifier si le dossier provient d\'un transfert JDMO et auto-remplir si nécessaire',
            'step_type' => 'decision',
            'requires_decision' => true,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"transfere_de_jdmo","type":"boolean","label":"Dossier transféré de JDMO ?","required":false,"default":false},{"name":"numero_jdmo","type":"text","label":"Numéro JDMO","required":false,"conditional":"transfere_de_jdmo == true"},{"name":"jdmo_existe","type":"boolean","label":"JDMO existe ?","required":true,"conditional":"transfere_de_jdmo == false"}]',
            'metadata' => '{"allows_transfer": true, "target_world": "JDMO", "check_transfer_history": true}',
        ]);

        // 24) PV Réception chantier
        $step24 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 24,
            'name' => 'PV Réception chantier',
            'description' => 'PV de réception chantier (même PV que JDMO)',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"generate_document","documentType":"pv_reception"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"pv_signe","type":"boolean","label":"PV signé","required":true},{"name":"date_pv","type":"date","label":"Date PV","required":true},{"name":"document_pv","type":"text","label":"Document PV (lien/fichier)"}]',
            'metadata' => '{}',
        ]);

        // 25) Faire le process de JDMO
        $step25 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 25,
            'name' => 'Faire le process de JDMO',
            'description' => 'Lancer le workflow/process JDMO si inexistant',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"create_task","assignedTo":"admin","title":"Créer / exécuter process JDMO","priority":"high"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"process_jdmo_lance","type":"boolean","label":"Process JDMO lancé","required":true},{"name":"commentaire","type":"textarea","label":"Commentaire"}]',
            'metadata' => '{}',
        ]);

        // 26) Système dossier diffusé
        $step26 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 26,
            'name' => 'Système dossier diffusé',
            'description' => 'Agrégation et diffusion de tous les documents du dossier avec possibilité d\'upload de fichiers multiples',
            'step_type' => 'document',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"create_notification","title":"Dossier diffusé","message":"Dossier agrégé et prêt à diffusion"},{"type":"send_email","recipient":"client","subject":"Dossier chantier - documents","template":"dossier_chantier_diffuse"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"documents_agreges","type":"boolean","label":"Documents agrégés","required":true},{"name":"dossier_pdf_genere","type":"boolean","label":"PDF du dossier généré","required":false},{"name":"fichiers_supplementaires","type":"file","label":"Fichiers supplémentaires","multiple":true,"accept":"*/*","required":false}]',
            'metadata' => '{"document_upload": true, "multiple_file_upload": true, "accepted_formats": ["*"]}',
        ]);

        // 27) Contrôle docs obligatoires
        $step27 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 27,
            'name' => 'Contrôle documents obligatoires',
            'description' => 'Vérifier la présence de tous les documents obligatoires',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => true,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"controle_effectue","type":"boolean","label":"Contrôle effectué","required":true},{"name":"documents_manquants","type":"textarea","label":"Documents manquants"}]',
            'metadata' => '{}',
        ]);

        // 28) Décision : Docs manquants ?
        $step28 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 28,
            'name' => 'Décision : Documents manquants ?',
            'description' => 'Si documents manquants : alerte + boucle contrôle',
            'step_type' => 'decision',
            'requires_decision' => true,
            'is_optional' => false,
            'can_loop_back' => true,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"documents_complets","type":"boolean","label":"Documents complets","required":true},{"name":"liste_manquants","type":"textarea","label":"Liste pièces manquantes"}]',
            'metadata' => '{}',
        ]);

        // 29) Alerte “Pièces manquantes”
        $step29 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 29,
            'name' => 'Alerte automatique “Pièces manquantes”',
            'description' => 'Alerte automatique pour compléter le dossier',
            'step_type' => 'notification',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => true,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"create_notification","title":"Pièces manquantes","message":"Des documents obligatoires sont manquants : compléter le dossier"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"responsable_relance","type":"text","label":"Responsable relance"},{"name":"date_relance","type":"date","label":"Date relance"}]',
            'metadata' => '{}',
        ]);

        // 30) Archivage final
        $step30 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 30,
            'name' => 'Archivage final du dossier chantier',
            'description' => 'Archivage final du dossier complet',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => false,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"create_notification","title":"Dossier archivé","message":"Archivage final du dossier chantier terminé"},{"type":"update_dossier_status","status":"cloture"},{"type":"create_notification","message":"Le dossier a été clôturé"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"archive_complete","type":"boolean","label":"Archivage terminé","required":true},{"name":"emplacement_archive","type":"text","label":"Emplacement archive"},{"name":"date_archivage","type":"date","label":"Date d\'archivage","required":true}]',
            'metadata' => '{}',
        ]);

        // 31) SAV possible
        $step31 = WorkflowStep::create([
            'workflow_template_id' => $template->id,
            'step_number' => 31,
            'name' => 'SAV possible',
            'description' => 'Gestion SAV : création tâches “bon d’interventions”',
            'step_type' => 'action',
            'requires_decision' => false,
            'is_optional' => true,
            'can_loop_back' => false,
            'next_step_id' => null,
            'parallel_steps' => '[]',
            'auto_actions' => '[{"type":"create_task","assignedTo":"sav","title":"SAV - Bon d’intervention","priority":"medium"}]',
            'conditions' => '[]',
            'form_fields' => '[{"name":"intervention_sav","type":"boolean","label":"Intervention SAV nécessaire"},{"name":"type_intervention","type":"select","label":"Type d’intervention","options":["Garantie","Réparation","Maintenance"]},{"name":"description_probleme","type":"textarea","label":"Description du problème"},{"name":"date_intervention","type":"date","label":"Date intervention"}]',
            'metadata' => '{}',
        ]);

        // ==========================================================
        // LIENS (next_step_id + branches + boucles)
        // ==========================================================

        // Début linéaire
        $step1->update(['next_step_id' => $step2->id]);
        $step2->update(['next_step_id' => $step3->id]);
        $step3->update(['next_step_id' => $step4->id]);
        $step4->update(['next_step_id' => $step5->id]);
        $step5->update(['next_step_id' => $step6->id]);
        $step6->update(['next_step_id' => $step7->id]);

        // Arrêté obtenu ?
        $step7->update([
            'decision_yes_next_step_id' => $step8->id,
            'decision_no_next_step_id'  => $step13->id,
        ]);

        // Arrêté OUI -> enregistrement -> transmission -> travaux finis ?
        $step8->update(['next_step_id' => $step9->id]);
        $step9->update(['next_step_id' => $step10->id]);

        // Travaux finis ?
        $step10->update([
            'decision_yes_next_step_id' => $step14->id, // -> compteur
            'decision_no_next_step_id'  => $step11->id, // -> notif J-15
        ]);

        // Notif J-15 -> prolongation -> retour enregistrement arrêté (maj date fin)
        $step11->update(['next_step_id' => $step12->id]);
        $step12->update(['next_step_id' => $step8->id]);

        // Arrêté NON -> alerte CRM -> compteur
        $step13->update(['next_step_id' => $step14->id]);

        // Compteur -> décision date RDV reçue ?
        $step14->update(['next_step_id' => $step15->id]);

        // ✅ CORRECTION demandée :
        // - Oui -> tâche chef d’équipe -> logistique
        // - Non -> logistique directement
        $step15->update([
            'decision_yes_next_step_id' => $step16->id, // Oui -> tâche chef d’équipe
            'decision_no_next_step_id'  => $step17->id, // Non -> logistique direct
        ]);
        $step16->update(['next_step_id' => $step17->id]);

        // Logistique -> démarrage -> suivi -> consuel
        $step17->update(['next_step_id' => $step18->id]);
        $step18->update(['next_step_id' => $step19->id]);
        $step19->update(['next_step_id' => $step20->id]);

        // Consuel -> décision attestation
        $step20->update(['next_step_id' => $step21->id]);
        $step21->update([
            'decision_yes_next_step_id' => $step22->id,
            'decision_no_next_step_id'  => $step20->id,
        ]);

        // Envoi client -> décision JDMO
        $step22->update(['next_step_id' => $step23->id]);
        $step23->update([
            'decision_yes_next_step_id' => $step24->id,
            'decision_no_next_step_id'  => $step25->id,
        ]);

        // Convergence -> dossier diffusé
        $step24->update(['next_step_id' => $step26->id]);
        $step25->update(['next_step_id' => $step26->id]);

        // Contrôle docs -> décision docs manquants
        $step26->update(['next_step_id' => $step27->id]);
        $step27->update(['next_step_id' => $step28->id]);

        // Docs manquants ?
        $step28->update([
            'decision_yes_next_step_id' => $step29->id,
            'decision_no_next_step_id'  => $step30->id,
        ]);

        // Alerte -> retour contrôle docs
        $step29->update(['next_step_id' => $step27->id]);

        // Archivage -> SAV (optionnel) -> fin
        $step30->update(['next_step_id' => $step31->id]);

        $this->command->info("{$worldCode} workflow créé (clean) : 31 étapes - RDV compteur 'validation' supprimée");
    } catch (\Exception $e) {
        $this->command->error("Failed to create {$worldCode} workflow: " . $e->getMessage());
        throw $e;
    }
}

}
