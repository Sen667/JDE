<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\WorkflowTemplate;
use App\Models\WorkflowStep;
use App\Models\DossierWorkflowProgress;
use App\Models\DossierTransfer;
use Illuminate\Http\Request;

class WorkflowController extends Controller
{
    public function getWorkflowTemplates(Request $request)
    {
        $templates = WorkflowTemplate::where('is_active', true)
            ->with(['steps' => function ($query) {
                $query->orderBy('step_number');
            }])
            ->paginate(15);

        return response()->json(['templates' => $templates]);
    }

    public function getWorkflowTemplate(Request $request, WorkflowTemplate $template)
    {
        $template->load(['steps' => function ($query) {
            $query->orderBy('step_number');
        }]);

        return response()->json(['template' => $template]);
    }

    public function getWorkflowSteps(Request $request, WorkflowTemplate $template)
    {
        $steps = $template->steps()->orderBy('step_number')->get();

        return response()->json(['steps' => $steps]);
    }

    public function createWorkflowProgress(Request $request)
    {
        $request->validate([
            'dossier_id' => 'required|exists:dossiers,id',
            'workflow_step_id' => 'required|exists:workflow_steps,id',
            'status' => 'required|in:pending,in_progress,completed,skipped',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]);

        // Check if user has access to dossier
        $dossier = \App\Models\Dossier::findOrFail($request->dossier_id);
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Authentication required'], 401);
        }
        if (!$user->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $progress = DossierWorkflowProgress::create($request->all());

        return response()->json([
            'message' => 'Workflow progress created successfully',
            'progress' => $progress->load('workflowStep')
        ], 201);
    }

    public function updateWorkflowProgress(Request $request, DossierWorkflowProgress $progress)
    {
        // Check if user has access to dossier
        $dossier = $progress->dossier;
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'status' => 'sometimes|in:pending,in_progress,completed,skipped',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'started_at' => 'nullable|date',
            'completed_at' => 'nullable|date'
        ]);

        $progress->update($request->all());

        return response()->json([
            'message' => 'Workflow progress updated successfully',
            'progress' => $progress->load('workflowStep')
        ]);
    }

    public function completeWorkflowStep(Request $request)
    {
        try {
        \Log::info('Workflow completion: Request received', [
            'user_id' => $request->user() ? $request->user()->id : 'null',
            'content_type' => $request->header('Content-Type'),
            'has_files' => $request->hasFile('files') || $request->hasFile('documents'),
            'all_input' => $request->all()
        ]);

            // Check if this is FormData (multipart/form-data) or JSON
            $isFormData = str_contains($request->header('Content-Type'), 'multipart/form-data');

            $formData = null;
            if ($isFormData) {
                // For FormData, get all input except files
                $allInput = $request->all();
                $formData = $allInput;
                // Remove file fields from form data
                foreach ($allInput as $key => $value) {
                    if ($value instanceof \Illuminate\Http\UploadedFile) {
                        unset($formData[$key]);
                    }
                }
                \Log::info('Workflow completion: FormData detected', [
                    'form_data_keys' => array_keys($formData ?? []),
                    'has_form_data' => !empty($formData)
                ]);
            } else {
                // Get form_data from JSON for backward compatibility
                $formData = $request->input('form_data');
                \Log::info('Workflow completion: JSON detected', [
                    'form_data_type' => gettype($formData),
                    'form_data_keys' => is_array($formData) ? array_keys($formData) : null
                ]);
            }

            $validated = $request->validate([
                'dossier_id' => 'required|exists:dossiers,id',
                'workflow_step_id' => 'required|string', // Allow strings for backward compatibility
                'decision' => 'nullable|boolean',
                'notes' => 'nullable|string',
                // Remove form_data from validation to avoid interference
            ]);

            // Add form_data back to validated data
            $validated['form_data'] = $formData;

            // Convert workflow_step_id to string for consistency
            $stepId = (string)$validated['workflow_step_id'];

            // Handle legacy fallback-step-N strings - convert to real database IDs
            if (preg_match('/^fallback-step-(\d+)$/', $stepId, $matches)) {
                $stepIndex = (int)$matches[1];

                \Log::info('Converting fallback step to real step ID', [
                    'fallback_step' => $stepId,
                    'step_index' => $stepIndex
                ]);

                // Find the actual workflow step ID for this dossier's world and step number
                $dossier = \App\Models\Dossier::findOrFail($request->dossier_id);
                $template = \App\Models\WorkflowTemplate::where('world_id', $dossier->world_id)
                    ->where('is_active', true)->first();

                if ($template) {
                    $actualStep = $template->steps()->where('step_number', $stepIndex)->first();
                    if ($actualStep) {
                        $stepId = (string)$actualStep->id;
                        \Log::info('Successfully mapped fallback-step-' . $stepIndex . ' to real step ID: ' . $actualStep->id, [
                            'step_name' => $actualStep->name
                        ]);
                    } else {
                        \Log::error('No real step found for fallback-step-' . $stepIndex . ' in template ' . $template->id);
                        return response()->json([
                            'message' => 'Validation failed',
                            'errors' => ['workflow_step_id' => ['No matching workflow step found.']]
                        ], 422);
                    }
                } else {
                    \Log::error('No workflow template found for dossier world: ' . $dossier->world_id);
                    return response()->json([
                        'message' => 'Validation failed',
                        'errors' => ['workflow_step_id' => ['No workflow template configured.']]
                    ], 422);
                }

                // Update the request with the mapped step ID
                $validated['workflow_step_id'] = $stepId;
                $request->merge(['workflow_step_id' => $stepId]);
            }

            // Now validate that the final step ID exists in the database
            if (!\App\Models\WorkflowStep::where('id', $stepId)->exists()) {
                \Log::error('Workflow step not found in database', ['step_id' => $stepId]);
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => ['workflow_step_id' => ['The selected workflow step is invalid.']]
                ], 422);
            }

            // Get workflow step details - moved earlier so it's available for decision handling
            $workflowStep = \App\Models\WorkflowStep::find($stepId);

            $user = $request->user();
            if (!$user) {
                \Log::error('Workflow completion: No authenticated user');
                return response()->json(['message' => 'Authentication required'], 401);
            }

            $dossier = \App\Models\Dossier::findOrFail($request->dossier_id);
            if (!$user->canAccessDossier($dossier)) {
                \Log::error('Workflow completion: Unauthorized access', [
                    'user_id' => $user->id,
                    'dossier_id' => $request->dossier_id
                ]);
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            \Log::info('Workflow completion: Processing step', [
                'dossier_id' => $request->dossier_id,
                'step_id' => $request->workflow_step_id
            ]);

            // Find or create progress record for this step
            $progress = DossierWorkflowProgress::with(['workflowStep', 'dossier.world'])
                ->where('dossier_id', $request->dossier_id)
                ->where('workflow_step_id', $request->workflow_step_id)
                ->first();

            if (!$progress) {
                // Create initial progress record if none exists
                $initialFormData = '{}';

                // For client creation step (Step 1), pre-populate with existing client data if available
                if ($workflowStep && $workflowStep->step_number === 1 && $dossier->clientInfo) {
                    $clientInfo = $dossier->clientInfo;
                    $initialFormData = json_encode([
                        'client_type' => $clientInfo->client_type ?? 'locataire',
                        'nom' => $clientInfo->nom ?? '',
                        'prenom' => $clientInfo->prenom ?? '',
                        'telephone' => $clientInfo->telephone ?? '',
                        'email' => $clientInfo->email ?? '',
                        'adresse_client' => $clientInfo->adresse_client ?? '',
                        'adresse_sinistre' => $clientInfo->adresse_sinistre ?? '',
                        'type_sinistre' => $clientInfo->type_sinistre ?? '',
                        'date_sinistre' => $clientInfo->date_sinistre ? $clientInfo->date_sinistre->format('Y-m-d') : null,
                        'compagnie_assurance' => $clientInfo->compagnie_assurance ?? '',
                        'numero_police' => $clientInfo->numero_police ?? '',
                        'proprietaire_nom' => $clientInfo->nom_proprietaire ?? '',
                        'proprietaire_prenom' => $clientInfo->prenom_proprietaire ?? '',
                        'proprietaire_telephone' => $clientInfo->telephone_proprietaire ?? '',
                        'proprietaire_email' => $clientInfo->email_proprietaire ?? '',
                        'proprietaire_adresse' => $clientInfo->adresse_proprietaire ?? '',
                    ]);
                    \Log::info('Workflow completion: Pre-populated Step 1 with existing client data', ['progress_id' => $progress->id ?? 'new']);
                }

                $progress = DossierWorkflowProgress::create([
                    'dossier_id' => $request->dossier_id,
                    'workflow_step_id' => $request->workflow_step_id,
                    'status' => 'pending',
                    'assigned_to' => $dossier->owner_id,
                    'form_data' => $initialFormData,
                ]);
                \Log::info('Workflow completion: Created initial progress', ['progress_id' => $progress->id]);
            }

            // ***** VALIDATE REQUIRED FILES BEFORE COMPLETION *****
            // Only validate files for decision steps when a decision is being made
            if ($request->decision !== null && $workflowStep && $workflowStep->requires_decision) {
                $this->validateRequiredFiles($workflowStep, $request, $dossier, $formData);
            }

            // For decision steps, only complete when we have an explicit decision from the decision form
            // Form submissions for decision steps should just save data without completing
            $shouldCompleteStep = true;
            if ($workflowStep && $workflowStep->requires_decision) {
                // Only complete decision steps when the 'decision' parameter is explicitly provided
                // This distinguishes between form submission (decision=null) and decision submission (decision=true/false)
                $shouldCompleteStep = $request->has('decision');
                if (!$shouldCompleteStep) {
                    \Log::info('Decision step form submission detected - saving data without completing step', [
                        'step_id' => $workflowStep->id,
                        'step_name' => $workflowStep->name,
                        'has_decision_param' => $request->has('decision'),
                        'decision_value' => $request->decision
                    ]);
                }
            }

            // Mark current step as completed only if this is a decision completion or non-decision step
            $updateData = [
                'status' => $shouldCompleteStep ? 'completed' : 'in_progress',
                'completed_at' => $shouldCompleteStep ? now() : null,
                'notes' => $request->notes
            ];

            // Process file uploads if any files were submitted
            $uploadedFiles = [];
            if ($request->hasFile('files')) {
                $uploadedFiles = $this->processFileUploads($request->file('files'), $dossier, $workflowStep, $user);
                \Log::info('Workflow completion: File uploads processed', [
                    'uploaded_files_count' => count($uploadedFiles)
                ]);
            }

            // Also check for files embedded in form data (from array-type form fields)
            if ($formData && is_array($formData)) {
                $embeddedFiles = $this->extractFilesFromFormData($formData, $dossier, $workflowStep, $user);
                $uploadedFiles = array_merge($uploadedFiles, $embeddedFiles);
                \Log::info('Workflow completion: Embedded file uploads processed', [
                    'embedded_files_count' => count($embeddedFiles),
                    'total_uploaded_files' => count($uploadedFiles)
                ]);
            }

            // Store form data if provided (use the extracted form_data, not $request->form_data)
            if ($formData) {
                // Remove file objects from form data before JSON encoding
                $cleanFormData = $this->cleanFormDataForJson($formData);
                $updateData['form_data'] = json_encode($cleanFormData);
                \Log::info('Workflow completion: Saving form data', [
                    'form_data_to_save' => $cleanFormData,
                    'json_encoded' => json_encode($cleanFormData)
                ]);
            } else {
                \Log::info('Workflow completion: No form data to save');
            }

            // Store decision choice if this is a decision step
            if ($request->decision !== null && $workflowStep && $workflowStep->requires_decision) {
                $updateData['decision_taken'] = $request->boolean('decision');
                $updateData['decision_reason'] = $request->notes; // Use notes as decision reason
            }

            $progress->update($updateData);

            // *********** PROCESS AUTO ACTIONS *************
            $this->processAutoActions($progress->workflowStep, $dossier, $request->user());
            // *********** END PROCESS AUTO ACTIONS *************

            // *********** SAVE CLIENT INFO FOR STEP 1 *************
            // For Step 1 (client creation), save form data to DossierClientInfo table
            if ($progress->workflowStep->step_number === 1 && $formData) {
                \Log::info('Step 1 completion - Saving client info', [
                    'dossier_id' => $dossier->id,
                    'world_code' => $dossier->world->code,
                    'form_data_keys' => array_keys($formData),
                    'has_existing_client_info' => $dossier->clientInfo ? true : false
                ]);

                $clientInfo = $dossier->clientInfo ?? new \App\Models\DossierClientInfo();

                // Map form fields to client info fields based on world
                $clientInfoData = [];

                // Common fields
                if (isset($formData['nom'])) $clientInfoData['nom'] = $formData['nom'];
                if (isset($formData['prenom'])) $clientInfoData['prenom'] = $formData['prenom'];
                if (isset($formData['telephone'])) $clientInfoData['telephone'] = $formData['telephone'];
                if (isset($formData['email'])) $clientInfoData['email'] = $formData['email'];

                // World-specific fields
                if ($dossier->world->code === 'DBCS') {
                    // DBCS specific fields
                    if (isset($formData['nom_societe'])) $clientInfoData['nom_societe'] = $formData['nom_societe'];
                    if (isset($formData['adresse_facturation'])) $clientInfoData['adresse_facturation'] = $formData['adresse_facturation'];
                    if (isset($formData['adresse_realisation_travaux'])) $clientInfoData['adresse_realisation_travaux'] = $formData['adresse_realisation_travaux'];
                    if (isset($formData['travaux_suite_sinistre'])) $clientInfoData['travaux_suite_sinistre'] = $formData['travaux_suite_sinistre'];
                    if (isset($formData['type_proprietaire'])) $clientInfoData['type_proprietaire'] = $formData['type_proprietaire'];
                    if (isset($formData['origine_dossier'])) $clientInfoData['origine_dossier'] = $formData['origine_dossier'];
                    if (isset($formData['numero_dossier_jde'])) $clientInfoData['numero_dossier_jde'] = $formData['numero_dossier_jde'];
                    if (isset($formData['references_devis_travaux'])) $clientInfoData['references_devis_travaux'] = $formData['references_devis_travaux'];
                    if (isset($formData['nature_travaux'])) $clientInfoData['nature_travaux'] = $formData['nature_travaux'];
                    if (isset($formData['numero_permis_construire'])) $clientInfoData['numero_permis_construire'] = $formData['numero_permis_construire'];
                    if (isset($formData['numero_declaration_prealable'])) $clientInfoData['numero_declaration_prealable'] = $formData['numero_declaration_prealable'];
                    if (isset($formData['branchement_provisoire'])) $clientInfoData['branchement_provisoire'] = $formData['branchement_provisoire'];
                    if (isset($formData['occupation_voirie'])) $clientInfoData['occupation_voirie'] = $formData['occupation_voirie'];
                } elseif ($dossier->world->code === 'JDMO') {
                    // JDMO specific fields
                    if (isset($formData['client_type'])) $clientInfoData['client_type'] = $formData['client_type'];
                    if (isset($formData['nom_societe'])) $clientInfoData['nom_societe'] = $formData['nom_societe'];
                    if (isset($formData['adresse_client'])) $clientInfoData['adresse_client'] = $formData['adresse_client'];
                    if (isset($formData['adresse_facturation'])) $clientInfoData['adresse_facturation'] = $formData['adresse_facturation'];
                    if (isset($formData['adresse_realisation_missions'])) $clientInfoData['adresse_realisation_missions'] = $formData['adresse_realisation_missions'];
                    if (isset($formData['travaux_suite_sinistre'])) $clientInfoData['travaux_suite_sinistre'] = $formData['travaux_suite_sinistre'];
                    if (isset($formData['type_proprietaire'])) $clientInfoData['type_proprietaire'] = $formData['type_proprietaire'];
                    if (isset($formData['origine_dossier'])) $clientInfoData['origine_dossier'] = $formData['origine_dossier'];
                    if (isset($formData['numero_dossier_jde'])) $clientInfoData['numero_dossier_jde'] = $formData['numero_dossier_jde'];
                    if (isset($formData['references_devis_travaux'])) $clientInfoData['references_devis_travaux'] = $formData['references_devis_travaux'];
                    if (isset($formData['nature_travaux'])) $clientInfoData['nature_travaux'] = $formData['nature_travaux'];
                    if (isset($formData['numero_permis_construire'])) $clientInfoData['numero_permis_construire'] = $formData['numero_permis_construire'];
                    if (isset($formData['numero_declaration_prealable'])) $clientInfoData['numero_declaration_prealable'] = $formData['numero_declaration_prealable'];
                    if (isset($formData['modification_plan'])) $clientInfoData['modification_plan'] = $formData['modification_plan'];
                    // Propriétaire fields for JDMO
                    if (isset($formData['proprietaire_nom'])) $clientInfoData['nom_proprietaire'] = $formData['proprietaire_nom'];
                    if (isset($formData['proprietaire_prenom'])) $clientInfoData['prenom_proprietaire'] = $formData['proprietaire_prenom'];
                    if (isset($formData['proprietaire_telephone'])) $clientInfoData['telephone_proprietaire'] = $formData['proprietaire_telephone'];
                    if (isset($formData['proprietaire_email'])) $clientInfoData['email_proprietaire'] = $formData['proprietaire_email'];
                    if (isset($formData['proprietaire_adresse'])) $clientInfoData['adresse_proprietaire'] = $formData['proprietaire_adresse'];
                }

                // Set dossier and world IDs if creating new client info
                if (!$clientInfo->exists) {
                    $clientInfoData['dossier_id'] = $dossier->id;
                    $clientInfoData['world_id'] = $dossier->world_id;
                }

                \Log::info('Step 1 completion - Client info data to save', [
                    'client_info_data' => $clientInfoData,
                    'is_new_client_info' => !$clientInfo->exists
                ]);

                try {
                    $clientInfo->fill($clientInfoData);
                    $saved = $clientInfo->save();

                    \Log::info('Step 1 completion - Client info save result', [
                        'save_successful' => $saved,
                        'client_info_id' => $clientInfo->id,
                        'saved_fields_count' => count($clientInfoData),
                        'saved_data' => $clientInfo->fresh() // Get fresh data from DB
                    ]);
                } catch (\Exception $e) {
                    \Log::error('Step 1 completion - Failed to save client info', [
                        'error' => $e->getMessage(),
                        'client_info_data' => $clientInfoData
                    ]);
                }
            }

            // *********** AUTOMATIC DOSSIER STATUS UPDATE *************
            // Change dossier status from "nouveau" to "en_cours" when first step is completed
            if ($progress->workflowStep->step_number === 1 && $dossier->status === 'nouveau') {
                $dossier->update(['status' => 'en_cours']);
                \Log::info('Dossier status automatically changed to "en_cours"', [
                    'dossier_id' => $dossier->id,
                    'completed_step_number' => $progress->workflowStep->step_number,
                    'previous_status' => 'nouveau',
                    'new_status' => 'en_cours'
                ]);
            }

            // Change dossier status to "cloture" when Step 27 (Clôture du dossier sinistre) is completed (JDE)
            if ($progress->workflowStep->step_number === 27 && $progress->workflowStep->name === 'Clôture du dossier sinistre') {
                $dossier->update(['status' => 'cloture']);
                \Log::info('Dossier status automatically changed to "cloture"', [
                    'dossier_id' => $dossier->id,
                    'completed_step_number' => $progress->workflowStep->step_number,
                    'step_name' => $progress->workflowStep->name,
                    'previous_status' => $dossier->getOriginal('status'),
                    'new_status' => 'cloture'
                ]);
            }

            // Change dossier status to "cloturee" when Step 14 (Clôture du dossier) is completed (JDMO)
            if ($progress->workflowStep->step_number === 14 && $progress->workflowStep->name === 'Clôture du dossier') {
                $dossier->update(['status' => 'cloturee']);
                \Log::info('Dossier status automatically changed to "cloturee"', [
                    'dossier_id' => $dossier->id,
                    'completed_step_number' => $progress->workflowStep->step_number,
                    'step_name' => $progress->workflowStep->name,
                    'previous_status' => $dossier->getOriginal('status'),
                    'new_status' => 'cloturee'
                ]);
            }
            // *********** END AUTOMATIC DOSSIER STATUS UPDATE *************

            // Find next step in workflow and create progress record
            $nextStep = $this->findNextWorkflowStep($dossier, $progress->workflowStep);
            if ($nextStep) {
                \Log::info('DEBUG findNextWorkflowStep result', [
                    'next_step_found' => true,
                    'next_step_id' => $nextStep->id,
                    'next_step_name' => $nextStep->name,
                    'next_step_number' => $nextStep->step_number
                ]);

                $nextProgress = DossierWorkflowProgress::firstOrCreate([
                    'dossier_id' => $request->dossier_id,
                    'workflow_step_id' => $nextStep->id,
                ], [
                    'status' => 'pending',
                    'assigned_to' => $dossier->owner_id,
                    'form_data' => '{}',
                ]);

                // Mark next step as in progress
                $nextProgress->update(['status' => 'in_progress', 'started_at' => now()]);
                \Log::info('Workflow completion: Created next step progress', [
                    'next_step_id' => $nextStep->id,
                    'next_step_name' => $nextStep->name,
                    'next_step_number' => $nextStep->step_number
                ]);
            } else {
                \Log::error('DEBUG findNextWorkflowStep result: NULL', [
                    'current_step_id' => $progress->workflow_step_id,
                    'current_step_name' => $progress->workflowStep->name,
                    'next_step_id_in_db' => $progress->workflowStep->next_step_id
                ]);
            }

            \Log::info('Workflow completion: Success', [
                'progress_id' => $progress->id,
                'dossier_id' => $request->dossier_id,
                'step_id' => $request->workflow_step_id
            ]);

            return response()->json([
                'message' => 'Workflow step completed successfully',
                'progress' => $progress->load('workflowStep'),
                'next_step' => $nextStep ?? null
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Workflow completion validation error', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            \Log::error('Workflow completion unexpected error', [
                'error' => $e->getMessage(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'message' => 'Internal server error',
                'error' => env('APP_DEBUG') ? $e->getMessage() : 'Please contact support'
            ], 500);
        }
    }

    public function getDossierWorkflowSteps(Request $request, $dossierId)
    {
        $dossier = \App\Models\Dossier::findOrFail($dossierId);
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Authentication required'], 401);
        }
        if (!$user->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $progress = $dossier->workflowProgress()->with('workflowStep')->get();

        // Ensure Step 1 has a progress record with pre-populated data if client info exists
        $step1Progress = $progress->firstWhere('workflowStep.step_number', 1);

        \Log::info('Step 1 pre-population check', [
            'dossier_id' => $dossier->id,
            'has_client_info' => $dossier->clientInfo ? true : false,
            'step1_progress_exists' => $step1Progress ? true : false,
            'step1_progress_form_data' => $step1Progress ? $step1Progress->form_data : null,
        ]);

        if ($dossier->clientInfo) {
            $clientInfo = $dossier->clientInfo;
            $initialFormData = json_encode([
                'client_type' => $clientInfo->client_type ?? 'locataire',
                'nom' => $clientInfo->nom ?? '',
                'prenom' => $clientInfo->prenom ?? '',
                'telephone' => $clientInfo->telephone ?? '',
                'email' => $clientInfo->email ?? '',
                'adresse_client' => $clientInfo->adresse_client ?? '',
                'adresse_sinistre' => $clientInfo->adresse_sinistre ?? '',
                'type_sinistre' => $clientInfo->type_sinistre ?? '',
                'date_sinistre' => $clientInfo->date_sinistre ? $clientInfo->date_sinistre->format('Y-m-d') : null,
                'compagnie_assurance' => $clientInfo->compagnie_assurance ?? '',
                'numero_police' => $clientInfo->numero_police ?? '',
                'proprietaire_nom' => $clientInfo->nom_proprietaire ?? '',
                'proprietaire_prenom' => $clientInfo->prenom_proprietaire ?? '',
                'proprietaire_telephone' => $clientInfo->telephone_proprietaire ?? '',
                'proprietaire_email' => $clientInfo->email_proprietaire ?? '',
                'proprietaire_adresse' => $clientInfo->adresse_proprietaire ?? '',
            ]);

            \Log::info('Generated initial form data for Step 1', [
                'form_data' => $initialFormData,
                'client_info' => [
                    'nom' => $clientInfo->nom,
                    'prenom' => $clientInfo->prenom,
                    'email' => $clientInfo->email,
                ]
            ]);

            if (!$step1Progress) {
                // Create new progress record for Step 1
                $template = $dossier->world->workflowTemplates()->where('is_active', true)->first();
                if ($template) {
                    $step1 = $template->steps()->where('step_number', 1)->first();
                    if ($step1) {
                        \Log::info('Creating new Step 1 progress record', ['template_id' => $template->id, 'step_id' => $step1->id]);
                        $step1Progress = DossierWorkflowProgress::create([
                            'dossier_id' => $dossier->id,
                            'workflow_step_id' => $step1->id,
                            'status' => 'pending',
                            'assigned_to' => $dossier->owner_id,
                            'form_data' => $initialFormData,
                        ]);
                        // Reload progress to include the new record
                        $progress = $dossier->workflowProgress()->with('workflowStep')->get();
                        \Log::info('Created new Step 1 progress record', ['progress_id' => $step1Progress->id]);
                    }
                }
            } elseif ($step1Progress->form_data === '{}' || $step1Progress->form_data === '[]' || $step1Progress->form_data === null || $step1Progress->form_data === '') {
                // Update existing progress record if form_data is empty or null
                \Log::info('Updating existing Step 1 progress record', [
                    'progress_id' => $step1Progress->id,
                    'old_form_data' => $step1Progress->form_data,
                    'new_form_data' => $initialFormData
                ]);
                $step1Progress->update(['form_data' => $initialFormData]);
                // Reload progress to include the updated record
                $progress = $dossier->workflowProgress()->with('workflowStep')->get();
                \Log::info('Updated existing Step 1 progress with client data', ['progress_id' => $step1Progress->id]);
            } else {
                \Log::info('Step 1 progress record already has form data', [
                    'progress_id' => $step1Progress->id,
                    'existing_form_data' => $step1Progress->form_data
                ]);
            }
        } else {
            \Log::info('No client info found for dossier, skipping Step 1 pre-population');
        }

        return response()->json(['steps' => $progress]);
    }

    public function getAvailableSteps(Request $request, $dossierId)
    {
        $dossier = \App\Models\Dossier::findOrFail($dossierId);
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $availableSteps = $dossier->getAvailableWorkflowSteps();

        return response()->json(['steps' => $availableSteps]);
    }

    public function getNextStep(Request $request)
    {
        $request->validate([
            'dossier_id' => 'required|exists:dossiers,id',
            'current_step_id' => 'nullable|exists:workflow_steps,id'
        ]);

        $dossier = \App\Models\Dossier::findOrFail($request->dossier_id);
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $currentStep = $request->current_step_id ? WorkflowStep::find($request->current_step_id) : null;
        $nextStep = $this->findNextWorkflowStep($dossier, $currentStep);

        return response()->json(['next_step' => $nextStep]);
    }

    public function checkTransferEligibility(Request $request)
    {
        $request->validate([
            'dossier_id' => 'required|exists:dossiers,id',
            'target_world' => 'required|exists:worlds,code'
        ]);

        $dossier = \App\Models\Dossier::findOrFail($request->dossier_id);
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $eligible = $dossier->isEligibleForTransferTo($request->target_world);

        return response()->json(['eligible' => $eligible]);
    }

    public function initiateTransfer(Request $request)
    {
        try {
            \Log::info('Transfer request received', [
                'dossier_id' => $request->dossier_id,
                'target_world' => $request->target_world,
                'user_id' => $request->user() ? $request->user()->id : null
            ]);

            $request->validate([
                'dossier_id' => 'required|exists:dossiers,id',
                'target_world' => 'required|exists:worlds,code'
            ]);

            $dossier = \App\Models\Dossier::findOrFail($request->dossier_id);

            if (!$request->user()) {
                return response()->json(['message' => 'Authentication required'], 401);
            }

            if (!$request->user()->canAccessDossier($dossier)) {
                \Log::warning('Unauthorized transfer attempt', [
                    'user_id' => $request->user()->id,
                    'dossier_id' => $request->dossier_id,
                    'target_world' => $request->target_world
                ]);
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $transfer = $dossier->transferTo($request->target_world, $request->user());

            // Return transfer info with new dossier ID for frontend redirect
            return response()->json([
                'success' => true,
                'message' => 'Transfert effectué avec succès',
                'transfer' => [
                    'id' => $transfer->id,
                    'source_dossier_id' => $transfer->source_dossier_id,
                    'target_dossier_id' => $transfer->target_dossier_id,
                ],
                'new_dossier_id' => $transfer->target_dossier_id
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::warning('Transfer validation error', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Données de transfert invalides',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            \Log::error('Transfer failed', [
                'error' => $e->getMessage(),
                'dossier_id' => $request->input('dossier_id'),
                'target_world' => $request->input('target_world'),
                'user_id' => $request->user() ? $request->user()->id : null,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du transfert: ' . $e->getMessage()
            ], 500);
        }
    }

    public function addAnnotation(Request $request)
    {
        $request->validate([
            'dossier_id' => 'required|exists:dossiers,id',
            'content' => 'required|string',
            'metadata' => 'nullable|array'
        ]);

        $dossier = \App\Models\Dossier::findOrFail($request->dossier_id);
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $annotation = $dossier->annotations()->create([
            'content' => $request->content,
            'user_id' => $request->user()->id,
            'metadata' => $request->metadata
        ]);

        return response()->json([
            'message' => 'Annotation added successfully',
            'annotation' => $annotation
        ]);
    }

    public function getAnnotations(Request $request, $dossierId)
    {
        $dossier = \App\Models\Dossier::findOrFail($dossierId);
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $annotations = $dossier->annotations()->with('user.profile')->get();

        return response()->json(['annotations' => $annotations]);
    }

    public function getWorkflowOverview(Request $request, $dossierId)
    {
        $dossier = \App\Models\Dossier::findOrFail($dossierId);
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get workflow template
        $template = \App\Models\WorkflowTemplate::where('world_id', $dossier->world_id)
            ->where('is_active', true)
            ->with(['steps' => function ($query) {
                $query->orderBy('step_number');
            }])
            ->first();

        // Get dossier workflow progress
        $progress = $dossier->workflowProgress()->with('workflowStep')->get();

        // Get counts
        $stats = [
            'total_steps' => $progress->count(),
            'completed_steps' => $progress->where('status', 'completed')->count(),
            'documents_count' => $dossier->attachments()->count(),
            'comments_count' => $dossier->comments()->count(),
            'appointments_count' => $dossier->appointments()->count(),
        ];

        // Get recent comments for activity
        $recentComments = $dossier->comments()
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'template' => $template,
            'progress' => $progress,
            'stats' => $stats,
            'recent_activity' => $recentComments,
            'clientInfo' => $dossier->clientInfo,
        ]);
    }

    public function getDossierTransferHistory(Request $request, $dossierId)
    {
        $dossier = \App\Models\Dossier::findOrFail($dossierId);
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $transfers = \App\Models\DossierTransfer::where('transfer_status', 'completed')
            ->where(function($query) use ($dossierId) {
                $query->where('source_dossier_id', $dossierId)
                      ->orWhere('target_dossier_id', $dossierId);
            })
            ->with(['sourceWorld', 'targetWorld'])
            ->orderBy('transferred_at', 'desc')
            ->get();

        // Format the transfers for frontend
        $formattedTransfers = $transfers->map(function ($transfer) {
            return [
                'id' => $transfer->id,
                'transfer_type' => $transfer->transfer_type,
                'transfer_status' => $transfer->transfer_status,
                'transferred_at' => $transfer->transferred_at,
                'source_world' => $transfer->sourceWorld ? [
                    'code' => $transfer->sourceWorld->code,
                    'name' => $transfer->sourceWorld->name
                ] : null,
                'target_world' => $transfer->targetWorld ? [
                    'code' => $transfer->targetWorld->code,
                    'name' => $transfer->targetWorld->name
                ] : null,
                'source_dossier_id' => $transfer->source_dossier_id,
                'target_dossier_id' => $transfer->target_dossier_id,
            ];
        });

        return response()->json(['transfers' => $formattedTransfers]);
    }

    public function getWorldWorkflowSteps(Request $request, $worldId)
    {
        // Try to find template by world_id first
        $template = \App\Models\WorkflowTemplate::where('world_id', $worldId)
            ->where('is_active', true)
            ->with(['steps' => function ($query) {
                $query->orderBy('step_number');
            }])
            ->first();

        // If not found by ID, try by world code (handle case where frontend passes "jde" instead of "1")
        if (!$template) {
            $world = \App\Models\World::where('code', strtoupper($worldId))->first();
            if ($world) {
                $template = \App\Models\WorkflowTemplate::where('world_id', $world->id)
                    ->where('is_active', true)
                    ->with(['steps' => function ($query) {
                        $query->orderBy('step_number');
                    }])
                    ->first();
            }
        }

        if (!$template) {
            \Log::info('Workflow template not found', [
                'worldId' => $worldId,
                'templates_count' => \App\Models\WorkflowTemplate::where('is_active', true)->count(),
                'worlds' => \App\Models\World::pluck('code')->toArray()
            ]);
            return response()->json(['error' => 'No workflow template found for this world'], 404);
        }

        return response()->json(['steps' => $template->steps]);
    }

    public function getDossierProgress(Request $request, $dossierId)
    {
        try {
            $dossier = \App\Models\Dossier::findOrFail($dossierId);
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Authentication required'], 401);
            }
            if (!$user->canAccessDossier($dossier)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $progress = $dossier->workflowProgress()->with('workflowStep')->get();

            \Log::info('getDossierProgress: Initial progress count', [
                'dossier_id' => $dossier->id,
                'progress_count' => $progress->count(),
                'world_id' => $dossier->world_id,
                'has_client_info' => $dossier->clientInfo ? true : false
            ]);

            // If no progress exists at all, create Step 1 progress regardless of client info
            if ($progress->isEmpty()) {
                \Log::info('getDossierProgress: No progress exists, creating Step 1', [
                    'dossier_id' => $dossier->id,
                    'world_id' => $dossier->world_id
                ]);

                // Find the workflow template for this world
                $template = \App\Models\WorkflowTemplate::where('world_id', $dossier->world_id)
                    ->where('is_active', true)
                    ->first();

                if (!$template) {
                    \Log::error('getDossierProgress: No active workflow template found', [
                        'dossier_id' => $dossier->id,
                        'world_id' => $dossier->world_id
                    ]);
                    return response()->json(['progress' => []]);
                }

                // Find the first step (lowest step_number)
                $firstStep = $template->steps()->orderBy('step_number')->first();
                if (!$firstStep) {
                    \Log::error('getDossierProgress: No steps found in template', [
                        'template_id' => $template->id,
                        'dossier_id' => $dossier->id
                    ]);
                    return response()->json(['progress' => []]);
                }

                // Prepare initial form data
                $initialFormData = '{}';
                if ($dossier->clientInfo) {
                    $clientInfo = $dossier->clientInfo;
                    $initialFormData = json_encode([
                        'client_type' => $clientInfo->client_type ?? 'locataire',
                        'nom' => $clientInfo->nom ?? '',
                        'prenom' => $clientInfo->prenom ?? '',
                        'telephone' => $clientInfo->telephone ?? '',
                        'email' => $clientInfo->email ?? '',
                        'adresse_client' => $clientInfo->adresse_client ?? '',
                        'adresse_sinistre' => $clientInfo->adresse_sinistre ?? '',
                        'type_sinistre' => $clientInfo->type_sinistre ?? '',
                        'date_sinistre' => $clientInfo->date_sinistre ? $clientInfo->date_sinistre->format('Y-m-d') : null,
                        'compagnie_assurance' => $clientInfo->compagnie_assurance ?? '',
                        'numero_police' => $clientInfo->numero_police ?? '',
                        'proprietaire_nom' => $clientInfo->nom_proprietaire ?? '',
                        'proprietaire_prenom' => $clientInfo->prenom_proprietaire ?? '',
                        'proprietaire_telephone' => $clientInfo->telephone_proprietaire ?? '',
                        'proprietaire_email' => $clientInfo->email_proprietaire ?? '',
                        'proprietaire_adresse' => $clientInfo->adresse_proprietaire ?? '',
                    ]);
                }

                try {
                    $firstStepProgress = DossierWorkflowProgress::create([
                        'dossier_id' => $dossier->id,
                        'workflow_step_id' => $firstStep->id,
                        'status' => 'pending',
                        'assigned_to' => $dossier->owner_id,
                        'form_data' => $initialFormData,
                    ]);

                    \Log::info('getDossierProgress: Successfully created first step progress', [
                        'progress_id' => $firstStepProgress->id,
                        'dossier_id' => $dossier->id,
                        'step_id' => $firstStep->id,
                        'step_name' => $firstStep->name,
                        'step_number' => $firstStep->step_number
                    ]);

                    // Reload progress to include the new record
                    $progress = $dossier->workflowProgress()->with('workflowStep')->get();

                } catch (\Exception $createError) {
                    \Log::error('getDossierProgress: Failed to create first step progress', [
                        'error' => $createError->getMessage(),
                        'dossier_id' => $dossier->id,
                        'step_id' => $firstStep->id,
                        'step_name' => $firstStep->name
                    ]);
                }
            }

            // Ensure Step 1 has a progress record with pre-populated data if client info exists
            $step1Progress = $progress->firstWhere('workflowStep.step_number', 1);

            \Log::info('OverviewTab progress check', [
                'dossier_id' => $dossier->id,
                'has_client_info' => $dossier->clientInfo ? true : false,
                'step1_progress_exists' => $step1Progress ? true : false,
                'step1_progress_form_data' => $step1Progress ? $step1Progress->form_data : null,
                'final_progress_count' => $progress->count()
            ]);

            if ($dossier->clientInfo && $step1Progress) {
                $clientInfo = $dossier->clientInfo;
                $initialFormData = json_encode([
                    'client_type' => $clientInfo->client_type ?? 'locataire',
                    'nom' => $clientInfo->nom ?? '',
                    'prenom' => $clientInfo->prenom ?? '',
                    'telephone' => $clientInfo->telephone ?? '',
                    'email' => $clientInfo->email ?? '',
                    'adresse_client' => $clientInfo->adresse_client ?? '',
                    'adresse_sinistre' => $clientInfo->adresse_sinistre ?? '',
                    'type_sinistre' => $clientInfo->type_sinistre ?? '',
                    'date_sinistre' => $clientInfo->date_sinistre ? $clientInfo->date_sinistre->format('Y-m-d') : null,
                    'compagnie_assurance' => $clientInfo->compagnie_assurance ?? '',
                    'numero_police' => $clientInfo->numero_police ?? '',
                    'proprietaire_nom' => $clientInfo->nom_proprietaire ?? '',
                    'proprietaire_prenom' => $clientInfo->prenom_proprietaire ?? '',
                    'proprietaire_telephone' => $clientInfo->telephone_proprietaire ?? '',
                    'proprietaire_email' => $clientInfo->email_proprietaire ?? '',
                    'proprietaire_adresse' => $clientInfo->adresse_proprietaire ?? '',
                ]);

                if ($step1Progress->form_data === '{}' || $step1Progress->form_data === '[]' || $step1Progress->form_data === null || $step1Progress->form_data === '') {
                    // Update existing progress record if form_data is empty or null
                    \Log::info('Updating Step 1 progress from OverviewTab', [
                        'progress_id' => $step1Progress->id,
                        'old_form_data' => $step1Progress->form_data,
                        'new_form_data' => $initialFormData
                    ]);
                    $step1Progress->update(['form_data' => $initialFormData]);
                    // Reload progress to include the updated record
                    $progress = $dossier->workflowProgress()->with('workflowStep')->get();
                    \Log::info('Updated Step 1 progress from OverviewTab', ['progress_id' => $step1Progress->id]);
                } else {
                    \Log::info('Step 1 progress already has form data from OverviewTab', [
                        'progress_id' => $step1Progress->id,
                        'existing_form_data' => $step1Progress->form_data
                    ]);
                }
            } else {
                \Log::info('No client info found for dossier from OverviewTab, skipping Step 1 pre-population');
            }

            return response()->json(['progress' => $progress]);
        } catch (\Exception $e) {
            \Log::error('Get dossier progress error', [
                'error' => $e->getMessage(),
                'dossier_id' => $dossierId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['message' => 'Internal server error'], 500);
        }
    }

    public function createInitialProgress(Request $request)
    {
        try {
            $validated = $request->validate([
                'dossier_id' => 'required|exists:dossiers,id',
                'workflow_step_id' => 'required|string',
                'status' => 'required|in:pending,in_progress'
            ]);

            $dossier = \App\Models\Dossier::findOrFail($validated['dossier_id']);
            $user = $request->user();

            if (!$user) {
                return response()->json(['message' => 'Authentication required'], 401);
            }

            if (!$user->canAccessDossier($dossier)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            // Check if progress already exists for this dossier
            $existingProgress = DossierWorkflowProgress::where('dossier_id', $validated['dossier_id'])->exists();
            if ($existingProgress) {
                return response()->json(['message' => 'Progress already exists for this dossier'], 409);
            }

            // Create progress record
            $progress = DossierWorkflowProgress::create([
                'dossier_id' => $validated['dossier_id'],
                'workflow_step_id' => $validated['workflow_step_id'],
                'status' => $validated['status'],
                'started_at' => now(),
                'assigned_to' => $dossier->owner_id,
                'form_data' => '{}',
            ]);

            return response()->json([
                'message' => 'Initial workflow progress created successfully',
                'progress' => $progress->load('workflowStep')
            ], 201);

        } catch (\Exception $e) {
            \Log::error('Create initial progress error', [
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);
            return response()->json([
                'message' => 'Internal server error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function processAutoActions($workflowStep, $dossier, $user)
    {
        $autoActions = json_decode($workflowStep->auto_actions, true);

        if (!$autoActions || !is_array($autoActions)) {
            \Log::info('No auto actions to process for step', [
                'step_id' => $workflowStep->id,
                'step_name' => $workflowStep->name
            ]);
            return;
        }

        foreach ($autoActions as $action) {
            try {
                $actionType = $action['type'] ?? null;

                \Log::info('Processing auto action', [
                    'action_type' => $actionType,
                    'action' => $action,
                    'step_id' => $workflowStep->id,
                    'dossier_id' => $dossier->id
                ]);

                if ($actionType === 'generate_document') {
                    $documentType = $action['documentType'] ?? null;

                    \Log::info('Document generation switch - document type', [
                        'document_type' => $documentType,
                        'document_type_type' => gettype($documentType),
                        'document_type_length' => strlen($documentType ?? ''),
                        'step_id' => $workflowStep->id
                    ]);

                    if ($documentType === 'convention') {
                        $this->generateConventionDocument($dossier, $user, $workflowStep);
                    } elseif ($documentType === 'mandat') {
                        $this->generateMandatDocument($dossier, $user, $workflowStep);
                    } elseif ($documentType === 'courrier_mise_en_cause') {
                        $this->generateCourrierMiseEnCauseDocument($dossier, $user);
                    } elseif ($documentType === 'rapport_contenu_mobilier') {
                        $this->generateRapportContenuMobilierDocument($dossier, $user);
                    } elseif ($documentType === 'rapport_expertise') {
                        $this->generateRapportExpertiseDocument($dossier, $user);
                    } elseif ($documentType === 'mesures_urgence') {
                        $this->generateMesuresUrgenceDocument($dossier, $user, $workflowStep);
                    } elseif ($documentType === 'edp') {
                        $this->generateEDPDocument($dossier, $user, $workflowStep);
                    } elseif ($documentType === 'contrat_maitrise_oeuvre') {
                        $this->generateContratMaitriseOeuvreDocument($dossier, $user, $workflowStep);
                    } elseif ($documentType === 'liste_reserves') {
                        \Log::info('Document generation - calling generateListeReservesDocument');
                        $this->generateListeReservesDocument($dossier, $user, $workflowStep);
                    } elseif ($documentType === 'pv_reception') {
                        \Log::info('Document generation - calling generatePvReceptionDocument');
                        $this->generatePvReceptionDocument($dossier, $user, $workflowStep);
                    } else {
                        \Log::warning('Unknown document type', [
                            'document_type' => $documentType,
                            'step_id' => $workflowStep->id
                        ]);
                    }
                } elseif ($actionType === 'transfer_document') {
                    $targetWorld = $action['to'] ?? null;
                    if ($targetWorld) {
                        $this->transferDossierToWorld($dossier, $targetWorld, $user);
                    } else {
                        \Log::warning('Transfer action missing target world', [
                            'action' => $action,
                            'step_id' => $workflowStep->id
                        ]);
                    }
                } elseif ($actionType === 'create_notification') {
                    $message = $action['message'] ?? 'Notification';
                    $this->createWorkflowNotification($dossier, $user, $message, $action);
                } elseif ($actionType === 'update_dossier_status') {
                    $status = $action['status'] ?? null;
                    if ($status) {
                        $this->updateDossierStatus($dossier, $status);
                    }
                } else {
                    \Log::warning('Unknown action type', [
                        'action_type' => $actionType,
                        'action' => $action,
                        'step_id' => $workflowStep->id
                    ]);
                }
            } catch (\Exception $e) {
                \Log::error('Error processing auto action', [
                    'action' => $action,
                    'step_id' => $workflowStep->id,
                    'error' => $e->getMessage()
                ]);
                // Continue processing other actions even if one fails
            }
        }
    }


    private function generateDocument($action, $workflowStep, $dossier, $user)
    {
        $documentType = $action['documentType'] ?? null;

        if (!$documentType) {
            \Log::error('Missing documentType in generate_document action', [
                'action' => $action,
                'step_id' => $workflowStep->id
            ]);
            return;
        }

        // CRITICAL: Validate that this document generation is authorized for this workflow step
        if (!$this->isDocumentGenerationAuthorized($documentType, $workflowStep)) {
            \Log::error('Document generation blocked: Not authorized for this workflow step', [
                'document_type' => $documentType,
                'step_id' => $workflowStep->id,
                'step_name' => $workflowStep->name,
                'dossier_id' => $dossier->id
            ]);
            return;
        }

        \Log::info('Generating document', [
            'document_type' => $documentType,
            'step_id' => $workflowStep->id,
            'dossier_id' => $dossier->id
        ]);

        // Validate required data before document generation
        if (!$this->validateDocumentGenerationData($documentType, $workflowStep, $dossier)) {
            \Log::warning('Document generation blocked due to incomplete data', [
                'document_type' => $documentType,
                'step_id' => $workflowStep->id,
                'dossier_id' => $dossier->id
            ]);
            return;
        }

        try {
            switch ($documentType) {
                case 'convention':
                    $this->generateConventionDocument($dossier, $user, $workflowStep);
                    break;

                case 'mandat':
                    $this->generateMandatDocument($dossier, $user, $workflowStep);
                    break;

                case 'courrier_mise_en_cause':
                    $this->generateCourrierMiseEnCauseDocument($dossier, $user);
                    break;

                case 'rapport_contenu_mobilier':
                    $this->generateRapportContenuMobilierDocument($dossier, $user);
                    break;

                case 'rapport_expertise':
                    $this->generateRapportExpertiseDocument($dossier, $user);
                    break;

                case 'mesures_urgence':
                    $this->generateMesuresUrgenceDocument($dossier, $user, $workflowStep);
                    break;

                case 'edp':
                    $this->generateEDPDocument($dossier, $user);
                    break;

                case 'contrat_maitrise_oeuvre':
                    $this->generateContratMaitriseOeuvreDocument($dossier, $user, $workflowStep);
                    break;

                default:
                    \Log::warning('Unknown document type', [
                        'document_type' => $documentType,
                        'step_id' => $workflowStep->id
                    ]);
                    break;
            }
        } catch (\Exception $e) {
            \Log::error('Document generation failed', [
                'document_type' => $documentType,
                'step_id' => $workflowStep->id,
                'dossier_id' => $dossier->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    private function validateDocumentGenerationData($documentType, $workflowStep, $dossier)
    {
        switch ($documentType) {
            case 'convention':
                return $this->validateConventionData($dossier);

            case 'mandat':
                return $this->validateMandatData($dossier);

            case 'courrier_mise_en_cause':
                return $this->validateCourrierMiseEnCauseData($dossier);

            case 'rapport_contenu_mobilier':
                return $this->validateRapportContenuMobilierData($dossier);

            case 'rapport_expertise':
                return $this->validateRapportExpertiseData($dossier);

            case 'edp':
                return $this->validateEDPData($workflowStep, $dossier);

            default:
                return true; // Allow generation for unknown types
        }
    }

    private function validateConventionData($dossier)
    {
        $clientInfo = $dossier->clientInfo;

        if (!$clientInfo) {
            \Log::warning('Convention generation blocked: No client info');
            return false;
        }

        $requiredFields = ['nom', 'prenom', 'adresse_sinistre'];
        foreach ($requiredFields as $field) {
            if (empty($clientInfo->$field)) {
                \Log::warning('Convention generation blocked: Missing required field', [
                    'field' => $field,
                    'value' => $clientInfo->$field
                ]);
                return false;
            }
        }

        return true;
    }

    private function validateMandatData($dossier)
    {
        $clientInfo = $dossier->clientInfo;

        if (!$clientInfo) {
            \Log::warning('Mandat generation blocked: No client info');
            return false;
        }

        $requiredFields = ['nom', 'prenom', 'adresse_sinistre'];
        foreach ($requiredFields as $field) {
            if (empty($clientInfo->$field)) {
                \Log::warning('Mandat generation blocked: Missing required field', [
                    'field' => $field,
                    'value' => $clientInfo->$field
                ]);
                return false;
            }
        }

        return true;
    }

    private function validateCourrierMiseEnCauseData($dossier)
    {
        $clientInfo = $dossier->clientInfo;

        if (!$clientInfo) {
            \Log::warning('Courrier mise en cause generation blocked: No client info');
            return false;
        }

        $requiredFields = ['compagnie_assurance', 'numero_police'];
        foreach ($requiredFields as $field) {
            if (empty($clientInfo->$field)) {
                \Log::warning('Courrier mise en cause generation blocked: Missing required field', [
                    'field' => $field,
                    'value' => $clientInfo->$field
                ]);
                return false;
            }
        }

        return true;
    }

    private function validateRapportContenuMobilierData($dossier)
    {
        // Rapport contenu mobilier is optional and doesn't require specific validation
        // It can be generated at any time as it's supplementary information
        return true;
    }

    private function validateRapportExpertiseData($dossier)
    {
        // Check if reconnaissance photos exist (required for expertise report)
        $reconnaissancePhotos = $dossier->attachments()
            ->where('document_type', 'photo')
            ->whereHas('workflowStep', function($query) {
                $query->where('name', 'Rendez-vous de reconnaissance');
            })
            ->count();

        if ($reconnaissancePhotos === 0) {
            \Log::warning('Rapport expertise generation blocked: No reconnaissance photos found');
            return false;
        }

        return true;
    }

    private function validateEDPData($workflowStep, $dossier)
    {
        // Get the workflow progress for this step to check form_data
        $progress = $dossier->workflowProgress()
            ->where('workflow_step_id', $workflowStep->id)
            ->where('status', 'completed')
            ->first();

        if (!$progress) {
            \Log::warning('EDP generation blocked: No completed workflow progress found');
            return false;
        }

        $formData = json_decode($progress->form_data, true);

        if (!$formData) {
            \Log::warning('EDP generation blocked: No form data found');
            return false;
        }

        // Validate that at least some building data is present (batiment is always required)
        if (empty($formData['batiment']) || !is_array($formData['batiment'])) {
            \Log::warning('EDP generation blocked: No batiment data found');
            return false;
        }

        // Check if mobilier is enabled and has data
        $mobilierEnabled = $formData['mobilier_checkbox'] ?? false;
        if ($mobilierEnabled && (empty($formData['mobilier']) || !is_array($formData['mobilier']))) {
            \Log::warning('EDP generation blocked: Mobilier enabled but no data found');
            return false;
        }

        // Check if electrique is enabled and has data
        $electriqueEnabled = $formData['electrique_checkbox'] ?? false;
        if ($electriqueEnabled) {
            $electriqueData = $formData['electrique'] ?? [];
            if (empty($electriqueData['pieces']) || !is_array($electriqueData['pieces'])) {
                \Log::warning('EDP generation blocked: Electrique enabled but no pieces data found');
                return false;
            }

            // Ensure at least one room has a name
            $hasValidRoom = false;
            foreach ($electriqueData['pieces'] as $piece) {
                if (!empty($piece['nom'])) {
                    $hasValidRoom = true;
                    break;
                }
            }

            if (!$hasValidRoom) {
                \Log::warning('EDP generation blocked: Electrique enabled but no valid rooms found');
                return false;
            }
        }

        return true;
    }

    private function isDocumentGenerationAuthorized($documentType, $workflowStep)
    {
        // Define which document types are authorized for which workflow steps
        $authorizedSteps = [
            'convention' => ['Envoi convention / mandat'],
            'mandat' => ['Envoi convention / mandat'],
            'courrier_mise_en_cause' => ['Édition courrier mise en cause'],
            'rapport_contenu_mobilier' => ['Génération rapport contenu mobilier'],
            'rapport_expertise' => ['Rédaction rapport d\'expertise'],
            'mesures_urgence' => ['Document mesures d\'urgence'],
            'edp' => ['Préparation EDP'],
            'contrat_maitrise_oeuvre' => ['Envoi contrat maîtrise d\'œuvre'],
            'liste_reserves' => ['Génération liste des réserves']
        ];

        // Check if the document type is authorized for this step
        if (!isset($authorizedSteps[$documentType])) {
            \Log::error('Unknown document type authorization check', [
                'document_type' => $documentType,
                'step_name' => $workflowStep->name
            ]);
            return false;
        }

        $authorizedStepNames = $authorizedSteps[$documentType];

        // Check if current step name matches any authorized step
        foreach ($authorizedStepNames as $authorizedStepName) {
            if (str_contains($workflowStep->name, $authorizedStepName)) {
                \Log::info('Document generation authorized', [
                    'document_type' => $documentType,
                    'step_name' => $workflowStep->name,
                    'authorized_pattern' => $authorizedStepName
                ]);
                return true;
            }
        }

        \Log::warning('Document generation not authorized for this step', [
            'document_type' => $documentType,
            'step_name' => $workflowStep->name,
            'authorized_steps' => $authorizedStepNames
        ]);

        return false;
    }

    private function generateConventionDocument($dossier, $user, $workflowStep)
    {
        // Use existing template or create a simple placeholder
        $html = $this->getConventionTemplate($dossier, $workflowStep);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
        $pdf->setPaper('a4', 'portrait');

        $fileName = 'convention_' . $dossier->reference . '.pdf';
        $path = 'documents/' . $fileName;

        // Save to storage
        \Storage::disk('public')->put($path, $pdf->output());

        // Create attachment record
        $dossier->attachments()->create([
            'workflow_step_id' => $workflowStep->id,
            'file_name' => $fileName,
            'file_type' => 'application/pdf',
            'file_size' => \Storage::disk('public')->size($path),
            'storage_path' => $path,
            'document_type' => 'convention',
            'uploaded_by' => $user->id,
            'is_generated' => true,
            'metadata' => ['generated_at' => now()]
        ]);

        \Log::info('Convention document generated', [
            'dossier_id' => $dossier->id,
            'file_name' => $fileName,
            'step_id' => $workflowStep->id
        ]);
    }

    private function generateMandatDocument($dossier, $user, $workflowStep)
    {
        // Use existing template or create a simple placeholder
        $html = $this->getMandatTemplate($dossier);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
        $pdf->setPaper('a4', 'portrait');

        $fileName = 'mandat_' . $dossier->reference . '.pdf';
        $path = 'documents/' . $fileName;

        // Save to storage
        \Storage::disk('public')->put($path, $pdf->output());

        // Create attachment record
        $dossier->attachments()->create([
            'workflow_step_id' => $workflowStep->id,
            'file_name' => $fileName,
            'file_type' => 'application/pdf',
            'file_size' => \Storage::disk('public')->size($path),
            'storage_path' => $path,
            'document_type' => 'mandat',
            'uploaded_by' => $user->id,
            'is_generated' => true,
            'metadata' => ['generated_at' => now()]
        ]);

        \Log::info('Mandat document generated', [
            'dossier_id' => $dossier->id,
            'file_name' => $fileName,
            'step_id' => $workflowStep->id
        ]);
    }

    private function generateCourrierMiseEnCauseDocument($dossier, $user)
    {
        // Get the workflow progress for step 8 to access form data
        $progress = $dossier->workflowProgress()
            ->whereHas('workflowStep', function($query) {
                $query->where('name', 'Édition courrier mise en cause');
            })
            ->where('status', 'completed')
            ->orderBy('completed_at', 'desc')
            ->first();

        $formData = [];
        if ($progress && $progress->form_data) {
            $formData = json_decode($progress->form_data, true);
            \Log::info('Courrier generation - Found form data', [
                'progress_id' => $progress->id,
                'form_data' => $formData
            ]);
        }

        // Load the actual HTML template
        $templatePath = base_path('../Docs JDE/templatecourrier.html');
        if (!file_exists($templatePath)) {
            \Log::error('Courrier template not found', ['path' => $templatePath]);
            throw new \Exception('Template file not found');
        }

        $html = file_get_contents($templatePath);
        $clientInfo = $dossier->clientInfo;

        // Prepare template data
        $templateData = [
            // Logo and branding
            'logo_url' => '/assets/JDE.png',

            // Recipient info (from form data)
            'destinataire_nom' => htmlspecialchars($formData['destinataire_nom'] ?? ''),
            'destinataire_adresse' => htmlspecialchars($formData['destinataire_adresse'] ?? ''),
            'destinataire_cp' => htmlspecialchars($formData['destinataire_cp'] ?? ''),
            'destinataire_ville' => htmlspecialchars($formData['destinataire_ville'] ?? ''),

            // Client info (from dossier)
            'client_nom' => $clientInfo ? htmlspecialchars($clientInfo->nom ?? '') : '',
            'client_prenom' => $clientInfo ? htmlspecialchars($clientInfo->prenom ?? '') : '',
            'adresse_sinistre' => $clientInfo ? htmlspecialchars($clientInfo->adresse_sinistre ?? '') : '',
            'date_sinistre' => $clientInfo && $clientInfo->date_sinistre ?
                \Carbon\Carbon::parse($clientInfo->date_sinistre)->format('d/m/Y') : '',
            'ref_jde' => 'JDE-' . substr($dossier->id, 0, 8),

            // Expert info (from form data)
            'ref_expert' => htmlspecialchars($formData['ref_expert'] ?? ''),
            'dossier_suivi_par' => htmlspecialchars($formData['dossier_suivi_par'] ?? ''),
            'assistance' => htmlspecialchars($formData['assistance'] ?? ''),

            // Insurance info (from form data and client)
            'assureur' => htmlspecialchars($formData['assureur'] ?? ''),
            'sinistre' => $clientInfo ? htmlspecialchars($clientInfo->type_sinistre ?? '') : '',
            'numero_contrat' => $clientInfo ? htmlspecialchars($clientInfo->numero_police ?? '') : '',
            'assure' => htmlspecialchars($formData['assure'] ?? ''),
            'affaire' => htmlspecialchars($formData['affaire'] ?? ''),

            // Letter content
            'CIVILITE' => $clientInfo && $clientInfo->prenom ? 'M.' : 'Mme',
            'NOM_DU_CLIENT' => $clientInfo ? htmlspecialchars(($clientInfo->prenom ?? '') . ' ' . ($clientInfo->nom ?? '')) : '',
            'DATE_RECLAMATION' => $clientInfo && $clientInfo->date_sinistre ?
                \Carbon\Carbon::parse($clientInfo->date_sinistre)->format('d/m/Y') : date('d/m/Y'),
            'NATURE_DU_SINISTRE' => $clientInfo ? htmlspecialchars($clientInfo->type_sinistre ?? 'sinistre') : 'sinistre',
            'DATE_ET_HEURE_DU_RDV' => 'À définir lors de la visite terrain',
        ];

        // Replace all placeholders in the template
        foreach ($templateData as $placeholder => $value) {
            $html = str_replace('{{' . $placeholder . '}}', $value, $html);
        }

        // Generate PDF
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
        $pdf->setPaper('a4', 'portrait');
        $pdf->setOptions([
            'defaultFont' => 'DejaVu Sans',
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => false,
        ]);

        $fileName = 'courrier_mise_en_cause_' . $dossier->reference . '.pdf';
        $path = 'documents/' . $fileName;

        \Storage::disk('public')->put($path, $pdf->output());

        $dossier->attachments()->create([
            'workflow_step_id' => $progress ? $progress->workflow_step_id : null,
            'file_name' => $fileName,
            'file_type' => 'application/pdf',
            'file_size' => \Storage::disk('public')->size($path),
            'storage_path' => $path,
            'document_type' => 'courrier_mise_en_cause',
            'uploaded_by' => $user->id,
            'is_generated' => true,
            'metadata' => ['generated_at' => now(), 'form_data' => $formData]
        ]);

        \Log::info('Courrier mise en cause document generated with full template', [
            'dossier_id' => $dossier->id,
            'file_name' => $fileName,
            'template_data' => $templateData
        ]);
    }

    private function generateRapportContenuMobilierDocument($dossier, $user)
    {
        $html = $this->getRapportContenuMobilierTemplate($dossier);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
        $pdf->setPaper('a4', 'portrait');

        $fileName = 'rapport_contenu_mobilier_' . $dossier->reference . '.pdf';
        $path = 'documents/' . $fileName;

        \Storage::disk('public')->put($path, $pdf->output());

        $dossier->attachments()->create([
            'workflow_step_id' => null,
            'file_name' => $fileName,
            'file_type' => 'application/pdf',
            'file_size' => \Storage::disk('public')->size($path),
            'storage_path' => $path,
            'document_type' => 'rapport_contenu_mobilier',
            'uploaded_by' => $user->id,
            'is_generated' => true,
            'metadata' => ['generated_at' => now()]
        ]);

        \Log::info('Rapport contenu mobilier document generated', [
            'dossier_id' => $dossier->id,
            'file_name' => $fileName
        ]);
    }

    private function generateRapportExpertiseDocument($dossier, $user)
    {
        $html = $this->getRapportExpertiseTemplate($dossier);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
        $pdf->setPaper('a4', 'portrait');

        $fileName = 'rapport_expertise_' . $dossier->reference . '.pdf';
        $path = 'documents/' . $fileName;

        \Storage::disk('public')->put($path, $pdf->output());

        $dossier->attachments()->create([
            'workflow_step_id' => null,
            'file_name' => $fileName,
            'file_type' => 'application/pdf',
            'file_size' => \Storage::disk('public')->size($path),
            'storage_path' => $path,
            'document_type' => 'rapport_expertise',
            'uploaded_by' => $user->id,
            'is_generated' => true,
            'metadata' => ['generated_at' => now()]
        ]);

        \Log::info('Rapport expertise document generated', [
            'dossier_id' => $dossier->id,
            'file_name' => $fileName
        ]);
    }

    private function generateMesuresUrgenceDocument($dossier, $user, $workflowStep = null)
    {
        try {
            // Use existing template method like other document generators
            $html = $this->getMesuresUrgenceTemplate($dossier, $workflowStep);

            \Log::info('Mesures urgence - HTML template loaded', [
                'dossier_id' => $dossier->id,
                'html_length' => strlen($html)
            ]);

            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
            $pdf->setPaper('a4', 'portrait');
            $pdf->setOptions([
                'defaultFont' => 'DejaVu Sans',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => false,
            ]);

            $pdfOutput = $pdf->output();

            \Log::info('Mesures urgence - PDF generated', [
                'dossier_id' => $dossier->id,
                'pdf_size' => strlen($pdfOutput)
            ]);

            $fileName = 'mesures_urgence_' . $dossier->reference . '.pdf';
            $path = 'documents/' . $fileName;

            $storageResult = \Storage::disk('public')->put($path, $pdfOutput);

            \Log::info('Mesures urgence - File stored', [
                'dossier_id' => $dossier->id,
                'file_name' => $fileName,
                'path' => $path,
                'storage_result' => $storageResult,
                'file_exists' => \Storage::disk('public')->exists($path)
            ]);

            $attachment = $dossier->attachments()->create([
                'workflow_step_id' => $workflowStep ? $workflowStep->id : null,
                'file_name' => $fileName,
                'file_type' => 'application/pdf',
                'file_size' => strlen($pdfOutput),
                'storage_path' => $path,
                'document_type' => 'mesures_urgence',
                'uploaded_by' => $user->id,
                'is_generated' => true,
                'metadata' => ['generated_at' => now()]
            ]);

            \Log::info('Mesures urgence document generated successfully', [
                'dossier_id' => $dossier->id,
                'file_name' => $fileName,
                'attachment_id' => $attachment->id,
                'file_size' => strlen($pdfOutput)
            ]);

        } catch (\Exception $e) {
            \Log::error('Mesures urgence document generation failed', [
                'dossier_id' => $dossier->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    private function generateEDPDocument($dossier, $user, $workflowStep = null)
    {
        try {
            \Log::info('EDP Excel generation - Starting', [
                'dossier_id' => $dossier->id,
                'workflow_step_id' => $workflowStep ? $workflowStep->id : null
            ]);

            // Get form data from the completed step
            $progress = null;
            $formData = [];
            if ($workflowStep) {
                $progress = $dossier->workflowProgress()
                    ->where('workflow_step_id', $workflowStep->id)
                    ->where('status', 'completed')
                    ->orderBy('completed_at', 'desc')
                    ->first();

                if ($progress && $progress->form_data) {
                    $formData = json_decode($progress->form_data, true);
                    \Log::info('EDP generation - Form data loaded', [
                        'form_data_keys' => array_keys($formData)
                    ]);
                }
            }

            // Generate Excel file with 3 sheets
            $excelData = $this->buildEDPExcelData($dossier, $formData);

            // Use Laravel Excel to create the file
            $fileName = 'EDP_' . $dossier->reference . '.xlsx';
            $path = 'documents/' . $fileName;

            // Create Excel file
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();

            // Sheet 1: BÂTIMENT
            $this->createBatimentSheet($spreadsheet, $excelData['batiment'], $dossier);

            // Sheet 2: MOBILIER INCORPORÉ (if enabled)
            if (!empty($excelData['mobilier'])) {
                $this->createMobilierSheet($spreadsheet, $excelData['mobilier']);
            }

            // Sheet 3: RELEVÉ ÉLECTRIQUE (if enabled)
            if (!empty($excelData['electrique'])) {
                $this->createElectriqueSheet($spreadsheet, $excelData['electrique']);
            }

            // Save Excel file
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $tempPath = tempnam(sys_get_temp_dir(), 'edp_') . '.xlsx';
            $writer->save($tempPath);

            // Store in Laravel storage
            $fileContent = file_get_contents($tempPath);
            $storageResult = \Storage::disk('public')->put($path, $fileContent);

            // Clean up temp file
            unlink($tempPath);

            \Log::info('EDP Excel file stored', [
                'file_name' => $fileName,
                'file_size' => strlen($fileContent),
                'storage_result' => $storageResult
            ]);

            // Create attachment record
            $attachment = $dossier->attachments()->create([
                'workflow_step_id' => $workflowStep ? $workflowStep->id : null,
                'file_name' => $fileName,
                'file_type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'file_size' => strlen($fileContent),
                'storage_path' => $path,
                'document_type' => 'edp',
                'uploaded_by' => $user->id,
                'is_generated' => true,
                'metadata' => [
                    'generated_at' => now(),
                    'sheets' => ['batiment', 'mobilier', 'electrique'],
                    'official_layout' => true,
                    'form_data_summary' => [
                        'mobilier_enabled' => !empty($formData['mobilier_checkbox']),
                        'electrique_enabled' => !empty($formData['electrique_checkbox'])
                    ]
                ]
            ]);

            \Log::info('EDP Excel document generated successfully', [
                'dossier_id' => $dossier->id,
                'file_name' => $fileName,
                'attachment_id' => $attachment->id,
                'file_size' => strlen($fileContent)
            ]);

        } catch (\Exception $e) {
            \Log::error('EDP Excel document generation failed', [
                'dossier_id' => $dossier->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    private function createNotification($action, $workflowStep, $dossier, $user)
    {
        // Placeholder for notification creation
        \Log::info('Notification creation requested', [
            'action' => $action,
            'step_id' => $workflowStep->id,
            'dossier_id' => $dossier->id
        ]);
    }

    private function sendEmail($action, $workflowStep, $dossier, $user)
    {
        // Placeholder for email sending
        \Log::info('Email sending requested', [
            'action' => $action,
            'step_id' => $workflowStep->id,
            'dossier_id' => $dossier->id
        ]);
    }

    private function createTask($action, $workflowStep, $dossier, $user)
    {
        // Placeholder for task creation
        \Log::info('Task creation requested', [
            'action' => $action,
            'step_id' => $workflowStep->id,
            'dossier_id' => $dossier->id
        ]);
    }

    private function createClient($action, $workflowStep, $dossier, $user)
    {
        \Log::info('🔧 CREATE CLIENT AUTO ACTION STARTED', [
            'step_id' => $workflowStep->id,
            'step_name' => $workflowStep->name,
            'dossier_id' => $dossier->id,
            'action' => $action
        ]);

        try {
            // Get the form data from the workflow progress
            $progress = $dossier->workflowProgress()
                ->where('workflow_step_id', $workflowStep->id)
                ->where('status', 'completed')
                ->orderBy('completed_at', 'desc')
                ->first();

            \Log::info('🔧 CREATE CLIENT - Found progress record', [
                'progress_exists' => $progress ? true : false,
                'progress_id' => $progress ? $progress->id : null,
                'progress_form_data' => $progress ? $progress->form_data : null
            ]);

            if (!$progress || !$progress->form_data) {
                \Log::warning('No form data found for client creation', [
                    'step_id' => $workflowStep->id,
                    'dossier_id' => $dossier->id
                ]);
                return;
            }

            $formData = json_decode($progress->form_data, true);

            \Log::info('🔧 CREATE CLIENT - Decoded form data', [
                'form_data_raw' => $progress->form_data,
                'form_data_decoded' => $formData,
                'json_error' => json_last_error_msg()
            ]);

            if (!$formData) {
                \Log::warning('Invalid form data for client creation', [
                    'step_id' => $workflowStep->id,
                    'dossier_id' => $dossier->id
                ]);
                return;
            }

            // Create or update the client info for this dossier
            $clientInfo = $dossier->clientInfo ?? new \App\Models\DossierClientInfo();

            // Map form fields to client info fields
            $clientInfo->client_type = $formData['client_type'] ?? 'locataire';
            $clientInfo->nom = $formData['nom'] ?? '';
            $clientInfo->prenom = $formData['prenom'] ?? '';
            $clientInfo->telephone = $formData['telephone'] ?? '';
            $clientInfo->email = $formData['email'] ?? '';
            $clientInfo->adresse_client = $formData['adresse_client'] ?? '';
            $clientInfo->adresse_sinistre = $formData['adresse_sinistre'] ?? '';
            $clientInfo->type_sinistre = $formData['type_sinistre'] ?? '';
            $clientInfo->date_sinistre = $formData['date_sinistre'] ?? null;
            $clientInfo->compagnie_assurance = $formData['compagnie_assurance'] ?? '';
            $clientInfo->numero_police = $formData['numero_police'] ?? '';

            // Handle propriétaire fields for locataires
            if ($clientInfo->client_type === 'locataire') {
                $clientInfo->nom_proprietaire = $formData['proprietaire_nom'] ?? '';
                $clientInfo->prenom_proprietaire = $formData['proprietaire_prenom'] ?? '';
                $clientInfo->telephone_proprietaire = $formData['proprietaire_telephone'] ?? '';
                $clientInfo->email_proprietaire = $formData['proprietaire_email'] ?? '';
                $clientInfo->adresse_proprietaire = $formData['proprietaire_adresse'] ?? '';
            }

            // Associate with dossier if new
            if (!$clientInfo->exists) {
                $clientInfo->dossier_id = $dossier->id;
                $clientInfo->world_id = $dossier->world_id;
            }

            // Ensure metadata field is set (required for JSON column)
            $clientInfo->metadata = $clientInfo->metadata ?? '{}';

            $clientInfo->save();

            \Log::info('Client information created/updated from workflow step', [
                'dossier_id' => $dossier->id,
                'client_info_id' => $clientInfo->id,
                'client_type' => $clientInfo->client_type,
                'nom' => $clientInfo->nom,
                'prenom' => $clientInfo->prenom
            ]);

        } catch (\Exception $e) {
            \Log::error('Error creating client from workflow step', [
                'step_id' => $workflowStep->id,
                'dossier_id' => $dossier->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    private function findNextWorkflowStep($dossier, $currentStep)
    {
        if (!$currentStep) {
            \Log::info('findNextWorkflowStep: No current step provided, using fallback logic');
            return null;
        }

        \Log::info('findNextWorkflowStep: Finding next step', [
            'current_step_id' => $currentStep->id,
            'current_step_name' => $currentStep->name,
            'dossier_id' => $dossier->id,
            'world_id' => $dossier->world_id,
            'current_next_step_id' => $currentStep->next_step_id,
            'is_decision_step' => $currentStep->requires_decision,
            'decision_yes_next' => $currentStep->decision_yes_next_step_id,
            'decision_no_next' => $currentStep->decision_no_next_step_id,
            'current_step_attributes' => array_keys($currentStep->getAttributes())
        ]);

        // If this is a decision step, check what decision was taken and route accordingly
        if ($currentStep->requires_decision) {
            // Get the progress record for this step to see the decision taken
            $progress = $dossier->workflowProgress()
                ->where('workflow_step_id', $currentStep->id)
                ->where('status', 'completed')
                ->first();

            if ($progress && $progress->decision_taken !== null) {
                $decisionTaken = $progress->decision_taken; // boolean: true for "Oui", false for "Non"

                \Log::info('findNextWorkflowStep: Decision step detected', [
                    'decision_taken' => $decisionTaken,
                    'decision_yes_next' => $currentStep->decision_yes_next_step_id,
                    'decision_no_next' => $currentStep->decision_no_next_step_id
                ]);

                $nextStepId = null;
                if ($decisionTaken && $currentStep->decision_yes_next_step_id) {
                    // Decision was "Oui" - go to yes path
                    $nextStepId = $currentStep->decision_yes_next_step_id;
                    \Log::info('findNextWorkflowStep: Routing to YES decision path', ['next_step_id' => $nextStepId]);
                } elseif (!$decisionTaken && $currentStep->decision_no_next_step_id) {
                    // Decision was "Non" - go to no path
                    $nextStepId = $currentStep->decision_no_next_step_id;
                    \Log::info('findNextWorkflowStep: Routing to NO decision path', ['next_step_id' => $nextStepId]);
                }

                if ($nextStepId) {
                    try {
                        $nextStep = WorkflowStep::find($nextStepId);
                        if ($nextStep) {
                            \Log::info('findNextWorkflowStep: Decision-based next step found successfully', [
                                'next_step_name' => $nextStep->name,
                                'next_step_number' => $nextStep->step_number,
                                'decision_taken' => $decisionTaken ? 'YES' : 'NO'
                            ]);
                            return $nextStep;
                        } else {
                            \Log::error('findNextWorkflowStep: Decision next step ID not found in database', [
                                'next_step_id' => $nextStepId,
                                'decision_taken' => $decisionTaken
                            ]);
                        }
                    } catch (\Exception $e) {
                        \Log::error('findNextWorkflowStep: Error finding decision next step', [
                            'next_step_id' => $nextStepId,
                            'decision_taken' => $decisionTaken,
                            'error' => $e->getMessage()
                        ]);
                    }
                } else {
                    \Log::info('findNextWorkflowStep: No decision-based next step configured', [
                        'decision_taken' => $decisionTaken,
                        'has_yes_path' => !empty($currentStep->decision_yes_next_step_id),
                        'has_no_path' => !empty($currentStep->decision_no_next_step_id)
                    ]);
                }
            } else {
                \Log::info('findNextWorkflowStep: Decision step but no decision taken yet', [
                    'progress_found' => $progress ? true : false,
                    'progress_decision_taken' => $progress ? $progress->decision_taken : null
                ]);
            }
        }

        // Fallback to regular next step if no decision routing applied
        if ($currentStep->next_step_id) {
            \Log::info('findNextWorkflowStep: Using regular next step ID', [
                'next_step_id' => $currentStep->next_step_id
            ]);

            try {
                $nextStep = WorkflowStep::find($currentStep->next_step_id);
                if ($nextStep) {
                    \Log::info('findNextWorkflowStep: Regular next step found successfully', [
                        'next_step_name' => $nextStep->name,
                        'next_step_number' => $nextStep->step_number
                    ]);
                    return $nextStep;
                } else {
                    \Log::error('findNextWorkflowStep: Regular next step ID not found in database', [
                        'next_step_id' => $currentStep->next_step_id
                    ]);
                }
            } catch (\Exception $e) {
                \Log::error('findNextWorkflowStep: Error finding regular next step', [
                    'next_step_id' => $currentStep->next_step_id,
                    'error' => $e->getMessage()
                ]);
            }
        } else {
            \Log::info('findNextWorkflowStep: No regular next step ID found on current step');
        }

        \Log::info('findNextWorkflowStep: Returning null, will use fallback logic');
        return null;
    }

    // Document template methods
    private function getConventionTemplate($dossier, $workflowStep = null)
    {
        $clientInfo = $dossier->clientInfo;

        // Get the progress for this step to access form data
        $progress = null;
        if ($workflowStep) {
            $progress = $dossier->workflowProgress()
                ->where('workflow_step_id', $workflowStep->id)
                ->where('status', 'completed')
                ->orderBy('completed_at', 'desc') // Get the most recent completed step
                ->first();
        }

        $formData = [];
        if ($progress && $progress->form_data) {
            $formData = json_decode($progress->form_data, true);
            \Log::info('Convention generation - Found form data in progress', [
                'progress_id' => $progress->id,
                'form_data_raw' => $progress->form_data,
                'form_data_decoded' => $formData
            ]);
        } else {
            \Log::info('Convention generation - No progress record found or no form data', [
                'workflow_step_id' => $workflowStep ? $workflowStep->id : null,
                'progress_found' => $progress ? true : false,
                'progress_id' => $progress ? $progress->id : null,
                'progress_form_data' => $progress ? $progress->form_data : null
            ]);
        }

        // Prepare template data
        $templateData = [
            'client_nom' => $clientInfo ? htmlspecialchars($clientInfo->nom ?? '') : '',
            'client_prenom' => $clientInfo ? htmlspecialchars($clientInfo->prenom ?? '') : '',
            'adresse_client' => $clientInfo ? htmlspecialchars($clientInfo->adresse_client ?? '') : '',
            'adresse_sinistre' => $clientInfo ? htmlspecialchars($clientInfo->adresse_sinistre ?? '') : '',
            'sinistre_date' => $clientInfo && $clientInfo->date_sinistre ?
                \Carbon\Carbon::parse($clientInfo->date_sinistre)->format('d/m/Y') : '',
            'dossier_no' => $dossier->reference,
        ];

        // Get the HTML template
        $templateHtml = file_get_contents(base_path('../Docs JDE/convention_clean_template_v2_with_tables.html'));

        // Handle checkbox selections - EXACTLY 3 radio buttons as specified
        $honorairesType = $formData['honoraires_type'] ?? 'tarif_ffb';
        $billingAddress = $formData['billing_address'] ?? 'client';
        $honorairesCustomValue = $formData['honoraires_custom_value'] ?? '';

        // Debug logging
        \Log::info('Convention generation - Form data received', [
            'honoraires_type' => $honorairesType,
            'billing_address' => $billingAddress,
            'honoraires_custom_value' => $honorairesCustomValue,
            'all_form_data' => $formData
        ]);

        // RENDER ALL 3 PARAGRAPHS - ONLY CHECK THE ONE CORRESPONDING TO honoraires_type

        // Paragraph 1: tarif_ffb - use larger checkboxes
        if ($honorairesType === 'tarif_ffb') {
            $templateHtml = str_replace(
                '<table class="check-table">
    <tr>
      <td class="check-cell"><span class="checkbox"></span></td>
      <td>
        <b>Vos honoraires HT</b> seront calculés sur le montant des dommages estimés consécutifs au sinistre ci-dessus visé, d’après
        le tarif ci après actualisable au dernier indice connu au jour du sinistre par l’application de l’indice de la Fédération
        Française du bâtiment.
      </td>
    </tr>
  </table>',
                '<table class="check-table">
    <tr>
      <td class="check-cell"><span style="width:5mm; height:5mm; border:1px solid #000; display:inline-block; background:#000; color:#fff; font-weight:bold; font-size:12pt; text-align:center; line-height:5mm;">X</span></td>
      <td>
        <b>Vos honoraires HT</b> seront calculés sur le montant des dommages estimés consécutifs au sinistre ci-dessus visé, d’après
        le tarif ci après actualisable au dernier indice connu au jour du sinistre par l’application de l’indice de la Fédération
        Française du bâtiment.
      </td>
    </tr>
  </table>',
                $templateHtml
            );
        }

        // Paragraph 2: six_percent - use larger checkboxes
        if ($honorairesType === 'six_percent') {
            $templateHtml = str_replace(
                '<table class="check-table">
    <tr>
      <td class="check-cell"><span class="checkbox"></span></td>
      <td>
        <b>Vos honoraires de 6 % du dommage</b>, en ajoutant la (tva de 20% applicable), avec un montant minimum de <b>2 500€ HT</b>
        et hors procédure judiciaire, seront calculés après accord définitif du dossier de chiffrages par la compagnie d’assurance
        sur le montant du dommage total ttc.
      </td>
    </tr>
  </table>',
                '<table class="check-table">
    <tr>
      <td class="check-cell"><span style="width:5mm; height:5mm; border:1px solid #000; display:inline-block; background:#000; color:#fff; font-weight:bold; font-size:12pt; text-align:center; line-height:5mm;">X</span></td>
      <td>
        <b>Vos honoraires de 6 % du dommage</b>, en ajoutant la (tva de 20% applicable), avec un montant minimum de <b>2 500€ HT</b>
        et hors procédure judiciaire, seront calculés après accord définitif du dossier de chiffrages par la compagnie d’assurance
        sur le montant du dommage total ttc.
      </td>
    </tr>
  </table>',
                $templateHtml
            );
        }

        // Paragraph 3: custom_amount - INJECT honoraires_custom_value IF SELECTED - use larger checkboxes
        if ($honorairesType === 'custom_amount') {
            $customAmountText = htmlspecialchars($honorairesCustomValue);
            $templateHtml = str_replace(
                '<table class="check-table">
    <tr>
      <td class="check-cell"><span class="checkbox"></span></td>
      <td>
        Vos honoraires de _________ TTC comprennent : la visite de reconnaissance du lieux sinistré, le rapport d’expertise, le
        rendez vous d’expertise avec les différents intervenants. ( en cas de chiffrage demandé, cochez la case correspondante ci-dessus au calcul des honoraires).
      </td>
    </tr>
  </table>',
                '<table class="check-table">
    <tr>
      <td class="check-cell"><span style="width:5mm; height:5mm; border:1px solid #000; display:inline-block; background:#000; color:#fff; font-weight:bold; font-size:12pt; text-align:center; line-height:5mm;">X</span></td>
      <td>
        Vos honoraires de <b>' . $customAmountText . '</b> TTC comprennent : la visite de reconnaissance du lieux sinistré, le rapport d’expertise, le
        rendez vous d’expertise avec les différents intervenants. ( en cas de chiffrage demandé, cochez la case correspondante ci-dessus au calcul des honoraires).
      </td>
    </tr>
  </table>',
                $templateHtml
            );
        }

        // Handle billing address checkboxes - use ASCII X for compatibility with DomPDF
        if ($billingAddress === 'client') {
            $templateHtml = str_replace(
                'Adresse de facturation : ☐ Adresse client &nbsp;&nbsp; ☐ Adresse sinistre',
                'Adresse de facturation : <span style="border:1px solid #000; padding:2px 4px; background:#000; color:#fff; display:inline-block; margin-right:4px; font-weight:bold; font-size:10pt;">X</span> Adresse client &nbsp;&nbsp; <span style="border:1px solid #000; padding:2px 4px; background:#fff; display:inline-block; margin-right:4px;"></span> Adresse sinistre',
                $templateHtml
            );
        } elseif ($billingAddress === 'sinistre') {
            $templateHtml = str_replace(
                'Adresse de facturation : ☐ Adresse client &nbsp;&nbsp; ☐ Adresse sinistre',
                'Adresse de facturation : <span style="border:1px solid #000; padding:2px 4px; background:#fff; display:inline-block; margin-right:4px;"></span> Adresse client &nbsp;&nbsp; <span style="border:1px solid #000; padding:2px 4px; background:#000; color:#fff; display:inline-block; margin-right:4px; font-weight:bold; font-size:10pt;">X</span> Adresse sinistre',
                $templateHtml
            );
        }

        // Replace placeholders with actual data
        foreach ($templateData as $placeholder => $value) {
            $templateHtml = str_replace('{{' . $placeholder . '}}', $value, $templateHtml);
        }

        return $templateHtml;
    }

    private function getMandatTemplate($dossier)
    {
        $clientInfo = $dossier->clientInfo;

        // Prepare template data
        $templateData = [
            'mandat.reference' => $dossier->reference,
            'client.title' => $clientInfo ? ucfirst($clientInfo->client_type ?? '') : '',
            'client.full_name' => $clientInfo ? htmlspecialchars(($clientInfo->nom ?? '') . ' ' . ($clientInfo->prenom ?? '')) : '',
            'client.role' => $clientInfo ? ucfirst($clientInfo->client_type ?? '') : '',
            'client.address' => $clientInfo ? htmlspecialchars($clientInfo->adresse_sinistre ?? '') : '',
            'client.email' => $clientInfo ? ($clientInfo->email ?? '') : '',
            'date.signature' => date('d/m/Y'),
            'place.signature' => '', // Will be extracted from address if needed
        ];

        // Get the HTML template
        $templateHtml = file_get_contents(base_path('../Docs JDE/Mandat-de-représentation-template.html'));

        // Replace placeholders with actual data
        foreach ($templateData as $placeholder => $value) {
            $templateHtml = str_replace('{{ ' . $placeholder . ' }}', $value, $templateHtml);
        }

        return $templateHtml;
    }

    private function getCourrierMiseEnCauseTemplate($dossier)
    {
        $clientInfo = $dossier->clientInfo;

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>Courrier Mise en Cause - {$dossier->reference}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #333; text-align: center; }
                .content { margin: 20px 0; }
            </style>
        </head>
        <body>
            <h1>COURRIER DE MISE EN CAUSE</h1>
            <div class='content'>
                <p><strong>Référence dossier:</strong> {$dossier->reference}</p>
                <p><strong>Compagnie d'assurance:</strong> " . ($clientInfo ? htmlspecialchars($clientInfo->compagnie_assurance) : 'Non spécifiée') . "</p>
                <p><strong>Numéro de police:</strong> " . ($clientInfo ? htmlspecialchars($clientInfo->numero_police) : 'Non spécifié') . "</p>
                <p><strong>Date de génération:</strong> " . date('d/m/Y') . "</p>
            </div>
            <div class='content'>
                <p>Par la présente, nous mettons en cause la compagnie d'assurance pour les dommages constatés.</p>
            </div>
        </body>
        </html>";
    }

    private function getRapportContenuMobilierTemplate($dossier)
    {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>Rapport Contenu Mobilier - {$dossier->reference}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #333; text-align: center; }
                .content { margin: 20px 0; }
            </style>
        </head>
        <body>
            <h1>RAPPORT CONTENU MOBILIER</h1>
            <div class='content'>
                <p><strong>Référence dossier:</strong> {$dossier->reference}</p>
                <p><strong>Date de génération:</strong> " . date('d/m/Y') . "</p>
            </div>
            <div class='content'>
                <p>Rapport détaillé sur le contenu mobilier endommagé.</p>
            </div>
        </body>
        </html>";
    }

    private function getRapportExpertiseTemplate($dossier)
    {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>Rapport Expertise - {$dossier->reference}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #333; text-align: center; }
                .content { margin: 20px 0; }
            </style>
        </head>
        <body>
            <h1>RAPPORT D'EXPERTISE</h1>
            <div class='content'>
                <p><strong>Référence dossier:</strong> {$dossier->reference}</p>
                <p><strong>Date de génération:</strong> " . date('d/m/Y') . "</p>
            </div>
            <div class='content'>
                <p>Rapport technique complet de l'expertise réalisée.</p>
            </div>
        </body>
        </html>";
    }

    private function getMesuresUrgenceTemplate($dossier, $workflowStep = null)
    {
        \Log::info('Mesures urgence template generation - Starting', [
            'dossier_id' => $dossier->id,
            'workflow_step_id' => $workflowStep ? $workflowStep->id : null,
            'workflow_step_name' => $workflowStep ? $workflowStep->name : null
        ]);

        // Get the workflow progress for this step to access form data
        $progress = null;
        if ($workflowStep) {
            $progress = $dossier->workflowProgress()
                ->where('workflow_step_id', $workflowStep->id)
                ->where('status', 'completed')
                ->orderBy('completed_at', 'desc')
                ->first();

            \Log::info('Mesures urgence template generation - Progress lookup', [
                'workflow_step_id' => $workflowStep->id,
                'progress_found' => $progress ? true : false,
                'progress_id' => $progress ? $progress->id : null,
                'progress_status' => $progress ? $progress->status : null,
                'progress_form_data_raw' => $progress ? $progress->form_data : null
            ]);
        } else {
            \Log::info('Mesures urgence template generation - No workflow step provided');
        }

        $formData = [];
        if ($progress && $progress->form_data) {
            $formData = json_decode($progress->form_data, true);
            \Log::info('Mesures urgence template generation - Form data decoded', [
                'progress_id' => $progress->id,
                'form_data_decoded' => $formData,
                'json_error' => json_last_error_msg()
            ]);
        } else {
            \Log::info('Mesures urgence template generation - No form data available', [
                'progress_exists' => $progress ? true : false,
                'has_form_data' => $progress && $progress->form_data ? true : false
            ]);
        }

        $clientInfo = $dossier->clientInfo;

        // Prepare template data
        $templateData = [
            // Logo and branding
            'logo_url' => '/assets/JDE.png',

            // Client info (from dossier)
            'sinistre_nom_prenom' => $clientInfo ? htmlspecialchars(($clientInfo->prenom ?? '') . ' ' . ($clientInfo->nom ?? '')) : '',
            'date_sinistre' => $clientInfo && $clientInfo->date_sinistre ?
                \Carbon\Carbon::parse($clientInfo->date_sinistre)->format('d/m/Y') : '',
            'type_sinistre' => $clientInfo ? htmlspecialchars($clientInfo->type_sinistre ?? '') : '',
            'compagnie_assurance' => $clientInfo ? htmlspecialchars($clientInfo->compagnie_assurance ?? '') : '',
            'reference_assurance' => htmlspecialchars($formData['reference_assurance'] ?? ''),
            'numero_police' => $clientInfo ? htmlspecialchars($clientInfo->numero_police ?? '') : '',
            'nom_expert' => htmlspecialchars($formData['nom_expert'] ?? ''),
            'nature_travaux' => htmlspecialchars($formData['nature_travaux'] ?? ''),
            'entreprise_intervention' => htmlspecialchars($formData['entreprise_intervention'] ?? ''),
            'observations' => htmlspecialchars($formData['observations'] ?? ''),
        ];

        // Get the HTML template
        $templateHtml = file_get_contents(base_path('../Docs JDE/Template-Mesures-durgence.html'));

        // Replace placeholders with actual data
        foreach ($templateData as $placeholder => $value) {
            $templateHtml = str_replace('{{' . $placeholder . '}}', $value, $templateHtml);
        }

        return $templateHtml;
    }

    private function buildEDPExcelData($dossier, $formData)
    {
        $excelData = [
            'batiment' => [],
            'mobilier' => [],
            'electrique' => []
        ];

        // BÂTIMENT data - always required
        $excelData['batiment'] = [
            'nom_adresse' => $formData['nom_adresse'] ?? '',
            'gros_oeuvre' => $formData['gros_oeuvre'] ?? '',
            'charpente_gitages' => $formData['charpente_gitages'] ?? '',
            'toiture' => [
                ['element' => 'Nature', 'rdc' => $formData['toiture_nature_rdc'] ?? '', 'etage1' => $formData['toiture_nature_1er'] ?? '', 'etage2' => $formData['toiture_nature_2eme'] ?? ''],
                ['element' => 'Isolation', 'rdc' => $formData['toiture_isolation_rdc'] ?? '', 'etage1' => $formData['toiture_isolation_1er'] ?? '', 'etage2' => $formData['toiture_isolation_2eme'] ?? ''],
                ['element' => 'Descente', 'rdc' => $formData['toiture_descente_rdc'] ?? '', 'etage1' => $formData['toiture_descente_1er'] ?? '', 'etage2' => $formData['toiture_descente_2eme'] ?? ''],
                ['element' => 'Chaîneau', 'rdc' => $formData['toiture_chaineau_rdc'] ?? '', 'etage1' => $formData['toiture_chaineau_1er'] ?? '', 'etage2' => $formData['toiture_chaineau_2eme'] ?? ''],
                ['element' => 'Gouttière', 'rdc' => $formData['toiture_gouttiere_rdc'] ?? '', 'etage1' => $formData['toiture_gouttiere_1er'] ?? '', 'etage2' => $formData['toiture_gouttiere_2eme'] ?? '']
            ],
            'menuiserie_interieure' => [
                'porte' => $formData['menuiserie_interieure_porte'] ?? '',
                'placard' => $formData['menuiserie_interieure_placard'] ?? '',
                'escalier' => $formData['menuiserie_interieure_escalier'] ?? '',
                'rampe' => $formData['menuiserie_interieure_rampe'] ?? '',
                'autres' => $formData['menuiserie_interieure_autres'] ?? ''
            ],
            'menuiserie_exterieure' => [
                'fenetre' => $formData['menuiserie_exterieure_fenetre'] ?? '',
                'porte' => $formData['menuiserie_exterieure_porte'] ?? '',
                'baie_vitree' => $formData['menuiserie_exterieure_baie_vitree'] ?? '',
                'volet' => $formData['menuiserie_exterieure_volet'] ?? ''
            ],
            'isolation' => [
                'plafond' => $formData['isolation_plafond'] ?? '',
                'mur' => $formData['isolation_mur'] ?? '',
                'toit' => $formData['isolation_toit'] ?? ''
            ],
            'platrerie' => [
                'platre' => $formData['platrerie_platre'] ?? '',
                'ba13' => $formData['platrerie_ba13'] ?? '',
                'cloison' => $formData['platrerie_cloison'] ?? '',
                'carreaux' => $formData['platrerie_carreaux'] ?? ''
            ],
            'sol' => [
                'nature' => $formData['sol_nature'] ?? '',
                'plinthes' => $formData['sol_plinthes'] ?? '',
                'seuil' => $formData['sol_seuil'] ?? ''
            ],
            'faience' => [
                'nature' => $formData['faience_nature'] ?? '',
                'dimension' => $formData['faience_dimension'] ?? ''
            ],
            'chauffage' => [
                'chaudiere' => $formData['chauffage_chaudiere'] ?? '',
                'radiateurs' => $formData['chauffage_radiateurs'] ?? ''
            ],
            'sanitaire' => [
                'bainoire' => $formData['sanitaire_baignoire'] ?? '',
                'lavabo' => $formData['sanitaire_lavabo'] ?? '',
                'ballon' => $formData['sanitaire_ballon'] ?? '',
                'douche' => $formData['sanitaire_douche'] ?? '',
                'robinet' => $formData['sanitaire_robinet'] ?? ''
            ],
            'embellissement' => [
                'plafond' => $formData['embellissement_plafond'] ?? '',
                'mural' => $formData['embellissement_mural'] ?? '',
                'divers' => $formData['embellissement_divers'] ?? ''
            ]
        ];

        // MOBILIER data - only if enabled
        if (!empty($formData['mobilier_checkbox'])) {
            $excelData['mobilier'] = [
                'meubles_bas' => [
                    '40cm' => $formData['mobilier_meubles_bas_40'] ?? 0,
                    '60cm' => $formData['mobilier_meubles_bas_60'] ?? 0,
                    '80cm' => $formData['mobilier_meubles_bas_80'] ?? 0,
                    '120cm' => $formData['mobilier_meubles_bas_120'] ?? 0
                ],
                'meubles_hauts' => [
                    '40cm' => $formData['mobilier_meubles_hauts_40'] ?? 0,
                    '60cm' => $formData['mobilier_meubles_hauts_60'] ?? 0,
                    '80cm' => $formData['mobilier_meubles_hauts_80'] ?? 0,
                    '120cm' => $formData['mobilier_meubles_hauts_120'] ?? 0
                ],
                'colonnes' => [
                    '40cm' => $formData['mobilier_colonnes_40'] ?? 0,
                    '60cm' => $formData['mobilier_colonnes_60'] ?? 0,
                    '80cm' => $formData['mobilier_colonnes_80'] ?? 0,
                    '120cm' => $formData['mobilier_colonnes_120'] ?? 0
                ],
                'evier' => [
                    '1_bac' => !empty($formData['mobilier_evier_1_bac']),
                    '2_bacs' => !empty($formData['mobilier_evier_2_bacs'])
                ],
                'meuble_angle' => [
                    'bas' => !empty($formData['mobilier_meuble_angle_bas']),
                    'haut' => !empty($formData['mobilier_meuble_angle_haut'])
                ],
                'plan_travail_longueur' => $formData['mobilier_plan_travail_longueur'] ?? 0
            ];
        }

        // ÉLECTRIQUE data - only if enabled
        if (!empty($formData['electrique_checkbox'])) {
            $excelData['electrique'] = [
                'pieces' => $formData['electrique_pieces'] ?? [],
                'observations' => $formData['electrique_observations'] ?? ''
            ];
        }

        return $excelData;
    }

    private function createBatimentSheet($spreadsheet, $batimentData, $dossier)
    {
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('BÂTIMENT');

        // Header
        $sheet->setCellValue('A1', 'ÉTAT DES PERTES - BÂTIMENT');
        $sheet->setCellValue('A2', 'Référence: ' . $dossier->reference);
        $sheet->setCellValue('A3', 'Date: ' . now()->format('d/m/Y'));

        $row = 5;

        // NOM / ADRESSE
        $sheet->setCellValue('A'.$row, 'NOM / ADRESSE');
        $sheet->setCellValue('B'.$row, $batimentData['nom_adresse']);
        $row += 2;

        // GROS ŒUVRE
        $sheet->setCellValue('A'.$row, 'GROS ŒUVRE');
        $sheet->setCellValue('B'.$row, $batimentData['gros_oeuvre']);
        $row += 2;

        // CHARPENTE / GITAGE
        $sheet->setCellValue('A'.$row, 'CHARPENTE / GITAGE');
        $sheet->setCellValue('B'.$row, $batimentData['charpente_gitages']);
        $row += 2;

        // TOITURE - Table format with levels as columns
        $sheet->setCellValue('A'.$row, 'TOITURE');
        $row++;

        // Headers for toiture table
        $sheet->setCellValue('A'.$row, 'Élément');
        $sheet->setCellValue('B'.$row, 'Rez-de-chaussée');
        $sheet->setCellValue('C'.$row, '1er étage');
        $sheet->setCellValue('D'.$row, '2ème étage');
        $row++;

        // Toiture data rows
        foreach ($batimentData['toiture'] as $toitureRow) {
            $sheet->setCellValue('A'.$row, $toitureRow['element']);
            $sheet->setCellValue('B'.$row, $toitureRow['rdc']);
            $sheet->setCellValue('C'.$row, $toitureRow['etage1']);
            $sheet->setCellValue('D'.$row, $toitureRow['etage2']);
            $row++;
        }
        $row += 2;

        // MENUISERIES INTÉRIEURES
        $sheet->setCellValue('A'.$row, 'MENUISERIES INTÉRIEURES');
        $row++;

        $sheet->setCellValue('A'.$row, 'Porte');
        $sheet->setCellValue('B'.$row, $batimentData['menuiserie_interieure']['porte']);
        $row++;

        $sheet->setCellValue('A'.$row, 'Placard');
        $sheet->setCellValue('B'.$row, $batimentData['menuiserie_interieure']['placard']);
        $row++;

        $sheet->setCellValue('A'.$row, 'Escalier');
        $sheet->setCellValue('B'.$row, $batimentData['menuiserie_interieure']['escalier']);
        $row++;

        $sheet->setCellValue('A'.$row, 'Rampe');
        $sheet->setCellValue('B'.$row, $batimentData['menuiserie_interieure']['rampe']);
        $row++;

        $sheet->setCellValue('A'.$row, 'Autres');
        $sheet->setCellValue('B'.$row, $batimentData['menuiserie_interieure']['autres']);
        $row += 2;

        // Continue with other sections...
        // This is a simplified version - in production you'd add all sections

        // Auto-size columns
        foreach (range('A', 'D') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }
    }

    private function createMobilierSheet($spreadsheet, $mobilierData)
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('MOBILIER INCORPORÉ');

        $row = 1;

        // Header
        $sheet->setCellValue('A'.$row, 'MOBILIER INCORPORÉ');
        $row += 2;

        // Meubles bas
        $sheet->setCellValue('A'.$row, 'Meubles bas');
        $row++;

        $sheet->setCellValue('A'.$row, '40cm');
        $sheet->setCellValue('B'.$row, $mobilierData['meubles_bas']['40cm']);
        $row++;

        $sheet->setCellValue('A'.$row, '60cm');
        $sheet->setCellValue('B'.$row, $mobilierData['meubles_bas']['60cm']);
        $row++;

        $sheet->setCellValue('A'.$row, '80cm');
        $sheet->setCellValue('B'.$row, $mobilierData['meubles_bas']['80cm']);
        $row++;

        $sheet->setCellValue('A'.$row, '120cm');
        $sheet->setCellValue('B'.$row, $mobilierData['meubles_bas']['120cm']);
        $row += 2;

        // Similar structure for meubles hauts, colonnes, etc.
        // This is simplified - full implementation would include all mobilier sections

        // Auto-size columns
        foreach (range('A', 'B') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }
    }

    private function createElectriqueSheet($spreadsheet, $electriqueData)
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('RELEVÉ ÉLECTRIQUE');

        $row = 1;

        // Header
        $sheet->setCellValue('A'.$row, 'RELEVÉ ÉLECTRIQUE');
        $row += 2;

        // Headers
        $sheet->setCellValue('A'.$row, 'Pièce');
        $sheet->setCellValue('B'.$row, 'Allumage');
        $sheet->setCellValue('C'.$row, 'Prise 16A');
        $sheet->setCellValue('D'.$row, 'Prise TV');
        $sheet->setCellValue('E'.$row, 'Prise 20A');
        $sheet->setCellValue('F'.$row, 'Prise 31A');
        $sheet->setCellValue('G'.$row, 'Va-et-vient');
        $sheet->setCellValue('H'.$row, 'Divers');
        $row++;

        // Data rows for each room
        foreach ($electriqueData['pieces'] as $piece) {
            $sheet->setCellValue('A'.$row, $piece['nom'] ?? '');
            $sheet->setCellValue('B'.$row, $piece['allumage'] ?? 0);
            $sheet->setCellValue('C'.$row, $piece['prise_16a'] ?? 0);
            $sheet->setCellValue('D'.$row, $piece['prise_tv'] ?? 0);
            $sheet->setCellValue('E'.$row, $piece['prise_20a'] ?? 0);
            $sheet->setCellValue('F'.$row, $piece['prise_31a'] ?? 0);
            $sheet->setCellValue('G'.$row, $piece['va_et_vient'] ?? 0);
            $sheet->setCellValue('H'.$row, $piece['divers'] ?? '');
            $row++;
        }

        // Observations at bottom
        $row += 2;
        $sheet->setCellValue('A'.$row, 'Observations générales:');
        $sheet->setCellValue('B'.$row, $electriqueData['observations'] ?? '');

        // Auto-size columns
        foreach (range('A', 'H') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }
    }

    private function generateContratMaitriseOeuvreDocument($dossier, $user, $workflowStep)
    {
        \Log::info('Generating contrat maîtrise d\'œuvre document', [
            'dossier_id' => $dossier->id,
            'step_id' => $workflowStep->id
        ]);

        // Get the workflow progress for this step to access form data
        $progress = $dossier->workflowProgress()
            ->where('workflow_step_id', $workflowStep->id)
            ->where('status', 'completed')
            ->orderBy('completed_at', 'desc')
            ->first();

        $formData = [];
        if ($progress && $progress->form_data) {
            $formData = json_decode($progress->form_data, true);
            \Log::info('Contrat generation - Found form data', [
                'progress_id' => $progress->id,
                'form_data' => $formData
            ]);
        }

        $clientInfo = $dossier->clientInfo;

        // Load the actual HTML template
        $templatePath = base_path('resources/templates/contrat-maitre-d-oeuvre-vierge.html');
        if (!file_exists($templatePath)) {
            \Log::error('Contrat template not found', ['path' => $templatePath]);
            throw new \Exception('Template file not found');
        }

        $html = file_get_contents($templatePath);

        // Calculate remuneration details from montant_honoraires
        $montantHonoraires = floatval($formData['montant_honoraires'] ?? 0);
        $montantPrincipal = floor($montantHonoraires); // Main euros amount
        $montantCents = round(($montantHonoraires - $montantPrincipal) * 100); // Cents
        $pourcentageTVA = '20'; // Default TVA percentage

        // Prepare template data
        $templateData = [
            // Client information from form data and client info
            'OBJET' => htmlspecialchars($formData['montant_honoraires'] ?? '') . ' - ' . htmlspecialchars($formData['duree_mission'] ?? ''),
            'ADRESSE' => $clientInfo ? htmlspecialchars($clientInfo->adresse_sinistre ?? '') : '',
            'CLIENT_NOM_PRENOM' => $clientInfo ? htmlspecialchars(($clientInfo->prenom ?? '') . ' ' . ($clientInfo->nom ?? '')) : '',
            'CLIENT_ADRESSE' => $clientInfo ? htmlspecialchars($clientInfo->adresse_client ?? '') : '',
            'CLIENT_TELEPHONE' => $clientInfo ? htmlspecialchars($clientInfo->telephone ?? '') : '',
            'CLIENT_EMAIL' => $clientInfo ? htmlspecialchars($clientInfo->email ?? '') : '',

            // Contract-specific placeholders
            'adresse_chantier' => $clientInfo ? htmlspecialchars($clientInfo->adresse_sinistre ?? '') : '',
            'lieu_signature' => 'Somain', // Default location
            'date_signature' => date('d/m/Y'),

            // Form data
            'MONTANT_HONORAIRES' => htmlspecialchars($formData['montant_honoraires'] ?? ''),
            'DUREE_MISSION' => htmlspecialchars($formData['duree_mission'] ?? ''),
            'CONDITIONS_PARTICULIERES' => htmlspecialchars($formData['conditions_particulieres'] ?? ''),

            // Remuneration section data
            'MONTANT_PRINCIPAL' => number_format($montantPrincipal, 0, ',', ' '),
            'MONTANT_CENTS' => str_pad($montantCents, 2, '0', STR_PAD_LEFT),
            'POURCENTAGE_TVA' => $pourcentageTVA,
        ];

        // Replace all placeholders in the template
        foreach ($templateData as $placeholder => $value) {
            $html = str_replace('{{' . $placeholder . '}}', $value, $html);
        }

        // Generate PDF
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
        $pdf->setPaper('a4', 'portrait');
        $pdf->setOptions([
            'defaultFont' => 'DejaVu Sans',
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => false,
        ]);

        $fileName = 'contrat_maitrise_oeuvre_' . $dossier->reference . '.pdf';
        $path = 'documents/' . $fileName;

        \Storage::disk('public')->put($path, $pdf->output());

        $dossier->attachments()->create([
            'workflow_step_id' => $workflowStep->id,
            'file_name' => $fileName,
            'file_type' => 'application/pdf',
            'file_size' => \Storage::disk('public')->size($path),
            'storage_path' => $path,
            'document_type' => 'contrat_maitrise_oeuvre',
            'uploaded_by' => $user->id,
            'is_generated' => true,
            'metadata' => ['generated_at' => now(), 'form_data' => $formData]
        ]);

        \Log::info('Contrat maîtrise d\'œuvre document generated with full template', [
            'dossier_id' => $dossier->id,
            'file_name' => $fileName,
            'template_data' => $templateData
        ]);
    }

    private function generateListeReservesDocument($dossier, $user, $workflowStep)
    {
        \Log::info('Generating liste des réserves document', [
            'dossier_id' => $dossier->id,
            'step_id' => $workflowStep->id
        ]);

        // Get the workflow progress for this step to access form data
        $progress = $dossier->workflowProgress()
            ->where('workflow_step_id', $workflowStep->id)
            ->where('status', 'completed')
            ->orderBy('completed_at', 'desc')
            ->first();

        $formData = [];
        if ($progress && $progress->form_data) {
            $formData = json_decode($progress->form_data, true);
            \Log::info('Liste des réserves generation - Found form data', [
                'progress_id' => $progress->id,
                'form_data' => $formData
            ]);
        }

        // Load the HTML template
        $templatePath = base_path('../doc JDMO/LISTE-DES-RESERVES.html');
        if (!file_exists($templatePath)) {
            \Log::error('Liste des réserves template not found', ['path' => $templatePath]);
            throw new \Exception('Template file not found');
        }

        $html = file_get_contents($templatePath);

        // Prepare template data - auto-populate client info, use form data for other fields
        $clientInfo = $dossier->clientInfo;
        $templateData = [
            'monsieur' => $clientInfo ? htmlspecialchars($clientInfo->nom ?? '') : '',
            'adresse_client' => $clientInfo ? htmlspecialchars($clientInfo->adresse_client ?? '') : '',
            'adresse_chantier' => htmlspecialchars($formData['adresse_chantier'] ?? ''),
            'date' => $this->formatDateForDocument($formData['date'] ?? ''),
            'lieu' => htmlspecialchars($formData['lieu'] ?? ''),
            'date_signature' => $this->formatDateForDocument(now()->format('Y-m-d')), // Auto-set to current date
        ];

        // Handle dynamic reservations list
        $reservations = $formData['reservations'] ?? [];

        // Replace each hardcoded row with dynamic content (left column 1-7)
        for ($i = 1; $i <= 7; $i++) {
            $reservationText = isset($reservations[$i - 1]) ? htmlspecialchars($reservations[$i - 1]['reservation']) : '';
            $pattern = '/(<tr><td class="num">' . preg_quote($i, '/') . '<\/td><td><div class="dots">)(<\/div><\/td><\/tr>)/';
            $replacement = '$1' . $reservationText . '$2';
            $html = preg_replace($pattern, $replacement, $html);
        }

        // Replace each hardcoded row with dynamic content (right column 8-13)
        for ($i = 8; $i <= 13; $i++) {
            $reservationIndex = $i - 1;
            $reservationText = isset($reservations[$reservationIndex]) ? htmlspecialchars($reservations[$reservationIndex]['reservation']) : '';
            $pattern = '/(<tr><td class="num">' . preg_quote($i, '/') . '<\/td><td><div class="dots">)(<\/div><\/td><\/tr>)/';
            $replacement = '$1' . $reservationText . '$2';
            $html = preg_replace($pattern, $replacement, $html);
        }

        // Replace template placeholders (handle both {{placeholder}} and {{ placeholder }} formats)
        foreach ($templateData as $placeholder => $value) {
            $html = str_replace('{{' . $placeholder . '}}', $value, $html);
            $html = str_replace('{{ ' . $placeholder . ' }}', $value, $html);
        }

        // Generate PDF
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
        $pdf->setPaper('a4', 'portrait');
        $pdf->setOptions([
            'defaultFont' => 'DejaVu Sans',
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => false,
        ]);

        $fileName = 'liste_des_reserves_' . $dossier->reference . '.pdf';
        $path = 'documents/' . $fileName;

        \Storage::disk('public')->put($path, $pdf->output());

        $dossier->attachments()->create([
            'workflow_step_id' => $workflowStep->id,
            'file_name' => $fileName,
            'file_type' => 'application/pdf',
            'file_size' => \Storage::disk('public')->size($path),
            'storage_path' => $path,
            'document_type' => 'liste_reserves',
            'uploaded_by' => $user->id,
            'is_generated' => true,
            'metadata' => ['generated_at' => now(), 'form_data' => $formData]
        ]);

        \Log::info('Liste des réserves document generated with dynamic reservations', [
            'dossier_id' => $dossier->id,
            'file_name' => $fileName,
            'reservations_count' => count($reservations),
            'template_data' => $templateData
        ]);
    }

    private function generatePvReceptionDocument($dossier, $user, $workflowStep)
    {
        \Log::info('Generating PV réception document', [
            'dossier_id' => $dossier->id,
            'step_id' => $workflowStep->id
        ]);

        // Get the workflow progress for this step to access form data
        $progress = $dossier->workflowProgress()
            ->where('workflow_step_id', $workflowStep->id)
            ->where('status', 'completed')
            ->orderBy('completed_at', 'desc')
            ->first();

        $formData = [];
        if ($progress && $progress->form_data) {
            $formData = json_decode($progress->form_data, true);
            \Log::info('PV réception generation - Found form data', [
                'progress_id' => $progress->id,
                'form_data' => $formData
            ]);
        }

        // Load the HTML template
        $templatePath = base_path('../doc JDMO/PROCES-VERBAL-DE-RECEPTION-TRAVAUX.html');
        if (!file_exists($templatePath)) {
            \Log::error('PV réception template not found', ['path' => $templatePath]);
            throw new \Exception('Template file not found');
        }

        $html = file_get_contents($templatePath);

        // Prepare template data - auto-populate client info
        $clientInfo = $dossier->clientInfo;
        $templateData = [
            'client_nom_prenom' => $clientInfo ? htmlspecialchars(($clientInfo->prenom ?? '') . ' ' . ($clientInfo->nom ?? '')) : '',
            'client_adresse' => $clientInfo ? htmlspecialchars($clientInfo->adresse_client ?? '') : '',
            'chantier_sinistre' => $clientInfo ? htmlspecialchars($clientInfo->adresse_sinistre ?? '') : '',
        ];

        // Handle radio button selection for reception type - use visual checkmarks for PDF compatibility
        $receptionType = $formData['reception_type'] ?? '';

        \Log::info('PV réception checkbox processing', [
            'reception_type' => $receptionType,
            'form_data' => $formData
        ]);

        // Replace all checkbox inputs with unchecked visual spans first
        $html = str_replace(
            '<input type="checkbox" style="vertical-align: middle; margin-right:4mm;">',
            '<span style="border:1px solid #000; padding:2px 4px; background:#fff; display:inline-block; margin-right:4px;"></span>',
            $html
        );

        // Now check the appropriate one based on selection using preg_replace for flexibility
        if ($receptionType === 'avec_reserves') {
            // Check "Avec réserves" using regex to match the span followed by "Avec réserves"
            $html = preg_replace(
                '/<span style="border:1px solid #000; padding:2px 4px; background:#fff; display:inline-block; margin-right:4px;"><\/span>\s*Avec réserves/',
                '<span style="border:1px solid #000; padding:2px 4px; background:#000; color:#fff; display:inline-block; margin-right:4px; font-weight:bold; font-size:10pt;">X</span>        Avec réserves',
                $html
            );
        } elseif ($receptionType === 'sans_reserves') {
            // Check "Sans réserves" using regex to match the span followed by "Sans réserves"
            $html = preg_replace(
                '/<span style="border:1px solid #000; padding:2px 4px; background:#fff; display:inline-block; margin-right:4px;"><\/span>\s*Sans réserves/',
                '<span style="border:1px solid #000; padding:2px 4px; background:#000; color:#fff; display:inline-block; margin-right:4px; font-weight:bold; font-size:10pt;">X</span>        Sans réserves',
                $html
            );
        }

        \Log::info('PV réception checkbox processing completed', [
            'reception_type' => $receptionType,
            'html_contains_checked' => str_contains($html, 'background:#000')
        ]);

        // Replace template placeholders (handle both {{placeholder}} and {{ placeholder }} formats)
        foreach ($templateData as $placeholder => $value) {
            $html = str_replace('{{' . $placeholder . '}}', $value, $html);
            $html = str_replace('{{ ' . $placeholder . ' }}', $value, $html);
        }

        // Generate PDF
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
        $pdf->setPaper('a4', 'portrait');
        $pdf->setOptions([
            'defaultFont' => 'DejaVu Sans',
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => false,
        ]);

        $fileName = 'pv_reception_travaux_' . $dossier->reference . '.pdf';
        $path = 'documents/' . $fileName;

        \Storage::disk('public')->put($path, $pdf->output());

        $dossier->attachments()->create([
            'workflow_step_id' => $workflowStep->id,
            'file_name' => $fileName,
            'file_type' => 'application/pdf',
            'file_size' => \Storage::disk('public')->size($path),
            'storage_path' => $path,
            'document_type' => 'pv_reception',
            'uploaded_by' => $user->id,
            'is_generated' => true,
            'metadata' => ['generated_at' => now(), 'form_data' => $formData]
        ]);

        \Log::info('PV réception document generated', [
            'dossier_id' => $dossier->id,
            'file_name' => $fileName,
            'reception_type' => $receptionType,
            'template_data' => $templateData
        ]);
    }

    private function getEDPTemplate($dossier)
    {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>État des Pertes - {$dossier->reference}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #333; text-align: center; }
                .content { margin: 20px 0; }
            </style>
        </head>
        <body>
            <h1>ÉTAT DES PERTES (EDP)</h1>
            <div class='content'>
                <p><strong>Référence dossier:</strong> {$dossier->reference}</p>
                <p><strong>Date de génération:</strong> " . date('d/m/Y') . "</p>
            </div>
            <div class='content'>
                <p>État détaillé des pertes et dommages subis.</p>
            </div>
        </body>
        </html>";
    }

    private function processFileUploads($files, $dossier, $workflowStep, $user)
    {
        $uploadedFiles = [];

        if (!$files || !is_array($files)) {
            \Log::info('No files to process');
            return $uploadedFiles;
        }

        foreach ($files as $index => $file) {
            try {
                if (!$file || !$file->isValid()) {
                    \Log::warning('Invalid file upload', ['index' => $index]);
                    continue;
                }

                // Generate a unique filename
                $originalName = $file->getClientOriginalName();
                $extension = $file->getClientOriginalExtension();
                $fileName = time() . '_' . $index . '_' . preg_replace('/[^A-Za-z0-9\-_.]/', '', $originalName);

                // Store file in public storage
                $path = $file->storeAs('documents', $fileName, 'public');

                if (!$path) {
                    \Log::error('Failed to store file', ['file_name' => $fileName]);
                    continue;
                }

                // Create attachment record
                $attachment = $dossier->attachments()->create([
                    'workflow_step_id' => $workflowStep->id,
                    'file_name' => $fileName,
                    'file_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'storage_path' => $path,
                    'document_type' => $this->determineDocumentType($file, $workflowStep),
                    'uploaded_by' => $user->id,
                    'is_generated' => false,
                    'metadata' => [
                        'original_name' => $originalName,
                        'uploaded_at' => now(),
                        'step_name' => $workflowStep->name
                    ]
                ]);

                $uploadedFiles[] = $attachment;

                \Log::info('File uploaded successfully', [
                    'attachment_id' => $attachment->id,
                    'file_name' => $fileName,
                    'file_size' => $file->getSize()
                ]);

            } catch (\Exception $e) {
                \Log::error('Error processing file upload', [
                    'index' => $index,
                    'error' => $e->getMessage(),
                    'file_name' => $file->getClientOriginalName() ?? 'unknown'
                ]);
                // Continue processing other files
            }
        }

        return $uploadedFiles;
    }

    private function determineDocumentType($file, $workflowStep, $formPath = null)
    {
        // First, try to determine document type from form field path (for workflow uploads)
        if ($formPath) {
            \Log::info('determineDocumentType: Checking form path', [
                'form_path' => $formPath,
                'step_name' => $workflowStep->name
            ]);

            $documentTypeMap = [
                'attestation_rc_pro_files' => 'Attestation RC Pro',
                'garantie_decennale_files' => 'Garantie décennale',
                'declaration_travaux_files' => 'Déclaration de travaux',
                'permis_construire_files' => 'Permis de construire',
                'autres_autorisations_files' => 'Autres autorisations',
                'pv_reunion_files' => 'PV de réunion',
                'documents' => 'Document', // Generic for array fields
            ];

            // Check if the form path contains any of the known field names
            foreach ($documentTypeMap as $fieldName => $docType) {
                if (str_contains($formPath, $fieldName)) {
                    \Log::info('determineDocumentType: Matched field', [
                        'field_name' => $fieldName,
                        'document_type' => $docType,
                        'form_path' => $formPath
                    ]);
                    return $docType;
                }
            }

            \Log::info('determineDocumentType: No field match found', [
                'form_path' => $formPath,
                'available_mappings' => array_keys($documentTypeMap)
            ]);
        }

        // Determine document type based on file extension and workflow step
        $extension = strtolower($file->getClientOriginalExtension());
        $stepName = strtolower($workflowStep->name);

        // For step 3 "Réalisation des plans" - plans and technical documents
        if (str_contains($stepName, 'réalisation des plans')) {
            if (in_array($extension, ['pdf', 'doc', 'docx'])) {
                return 'plan_technique';
            } elseif (in_array($extension, ['jpg', 'jpeg', 'png', 'gif'])) {
                return 'photo';
            } elseif (in_array($extension, ['dwg', 'dxf'])) {
                return 'plan_cad';
            }
        }

        // Default document type based on extension
        switch ($extension) {
            case 'pdf':
                return 'document_pdf';
            case 'doc':
            case 'docx':
                return 'document_word';
            case 'xls':
            case 'xlsx':
                return 'document_excel';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return 'photo';
            default:
                return 'document_autre';
        }
    }

    private function extractFilesFromFormData($formData, $dossier, $workflowStep, $user)
    {
        $uploadedFiles = [];

        if (!$formData || !is_array($formData)) {
            return $uploadedFiles;
        }

        // Recursively search for file objects in the form data
        $this->extractFilesRecursive($formData, $uploadedFiles, $dossier, $workflowStep, $user);

        return $uploadedFiles;
    }

    private function extractFilesRecursive($data, &$uploadedFiles, $dossier, $workflowStep, $user, $path = '')
    {
        if (!is_array($data)) {
            return;
        }

        foreach ($data as $key => $value) {
            $currentPath = $path ? $path . '.' . $key : $key;

            if ($value instanceof \Illuminate\Http\UploadedFile) {
                // Found a file object - process it
                // Pass the field name (currentPath) as the form path for document type determination
                $processedFiles = $this->processSingleFile($value, $dossier, $workflowStep, $user, $currentPath);
                $uploadedFiles = array_merge($uploadedFiles, $processedFiles);
            } elseif (is_array($value)) {
                // Recursively search in nested arrays
                $this->extractFilesRecursive($value, $uploadedFiles, $dossier, $workflowStep, $user, $currentPath);
            }
        }
    }

    private function processSingleFile($file, $dossier, $workflowStep, $user, $formFieldPath = '')
    {
        $uploadedFiles = [];

        try {
            if (!$file || !$file->isValid()) {
                \Log::warning('Invalid file in form data', ['form_field_path' => $formFieldPath]);
                return $uploadedFiles;
            }

            // Generate a unique filename
            $originalName = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $timestamp = time();
            $random = rand(1000, 9999);
            $fileName = $timestamp . '_' . $random . '_' . preg_replace('/[^A-Za-z0-9\-_.]/', '', $originalName);

            // Store file in public storage
            $storagePath = $file->storeAs('documents', $fileName, 'public');

            if (!$storagePath) {
                \Log::error('Failed to store file from form data', ['file_name' => $fileName]);
                return $uploadedFiles;
            }

            // Create attachment record
            $attachment = $dossier->attachments()->create([
                'workflow_step_id' => $workflowStep->id,
                'file_name' => $fileName,
                'file_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'storage_path' => $storagePath,
                'document_type' => $this->determineDocumentType($file, $workflowStep, $formFieldPath),
                'uploaded_by' => $user->id,
                'is_generated' => false,
                'metadata' => [
                    'original_name' => $originalName,
                    'uploaded_at' => now(),
                    'step_name' => $workflowStep->name,
                    'form_path' => $formFieldPath, // Path in form data where file was found
                    'source' => 'workflow_form'
                ]
            ]);

            $uploadedFiles[] = $attachment;

            \Log::info('File from form data uploaded successfully', [
                'attachment_id' => $attachment->id,
                'file_name' => $fileName,
                'file_size' => $file->getSize(),
                'form_path' => $formFieldPath
            ]);

        } catch (\Exception $e) {
            \Log::error('Error processing file from form data', [
                'error' => $e->getMessage(),
                'form_path' => $path,
                'file_name' => $file->getClientOriginalName() ?? 'unknown'
            ]);
        }

        return $uploadedFiles;
    }

    private function cleanFormDataForJson($formData)
    {
        if (!$formData) {
            return $formData;
        }

        // If formData is a string, try to decode it
        if (is_string($formData)) {
            $decoded = json_decode($formData, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $formData = $decoded;
            } else {
                return $formData; // Return as-is if not JSON
            }
        }

        if (!is_array($formData)) {
            return $formData;
        }

        $cleaned = [];

        foreach ($formData as $key => $value) {
            // Skip file objects and uploaded file data
            if ($value instanceof \Illuminate\Http\UploadedFile) {
                continue;
            }

            // Recursively clean nested arrays
            if (is_array($value)) {
                $cleaned[$key] = $this->cleanFormDataForJson($value);
            } else {
                $cleaned[$key] = $value;
            }
        }

        return $cleaned;
    }

    private function transferDossierToWorld($dossier, $targetWorld, $user)
    {
        try {
            \Log::info('Transferring dossier to world', [
                'dossier_id' => $dossier->id,
                'target_world' => $targetWorld,
                'user_id' => $user->id
            ]);

            $transfer = $dossier->transferTo($targetWorld, $user);

            \Log::info('Dossier transfer completed successfully', [
                'dossier_id' => $dossier->id,
                'source_dossier_id' => $transfer->source_dossier_id,
                'target_dossier_id' => $transfer->target_dossier_id,
                'target_world' => $targetWorld
            ]);

        } catch (\Exception $e) {
            \Log::error('Dossier transfer failed', [
                'dossier_id' => $dossier->id,
                'target_world' => $targetWorld,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    private function updateDossierStatus($dossier, $status)
    {
        try {
            \Log::info('Updating dossier status', [
                'dossier_id' => $dossier->id,
                'new_status' => $status,
                'current_status' => $dossier->status
            ]);

            $dossier->update(['status' => $status]);

            \Log::info('Dossier status updated successfully', [
                'dossier_id' => $dossier->id,
                'old_status' => $dossier->getOriginal('status'),
                'new_status' => $dossier->status
            ]);

        } catch (\Exception $e) {
            \Log::error('Dossier status update failed', [
                'dossier_id' => $dossier->id,
                'target_status' => $status,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    private function createWorkflowNotification($dossier, $user, $message, $action)
    {
        try {
            \Log::info('Creating workflow notification', [
                'dossier_id' => $dossier->id,
                'message' => $message,
                'user_id' => $user->id
            ]);

            // Create a notification record (you may need to implement this based on your notification system)
            // For now, just log it
            \Log::info('Workflow notification created', [
                'dossier_id' => $dossier->id,
                'message' => $message,
                'action' => $action
            ]);

        } catch (\Exception $e) {
            \Log::error('Workflow notification creation failed', [
                'dossier_id' => $dossier->id,
                'message' => $message,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    private function formatDateForDocument($dateString)
    {
        if (!$dateString) {
            return '';
        }

        try {
            // If it's an ISO date format (YYYY-MM-DDTHH:MM:SS.sssZ), extract and reformat
            if (preg_match('/^(\d{4})-(\d{2})-(\d{2})T/', $dateString, $matches)) {
                return $matches[3] . '-' . $matches[2] . '-' . $matches[1]; // DD-MM-YYYY
            }

            // Fallback to DateTime parsing for other formats
            $date = new \DateTime($dateString);
            return $date->format('d-m-Y');
        } catch (\Exception $e) {
            \Log::warning('Failed to parse date for document formatting', [
                'date_string' => $dateString,
                'error' => $e->getMessage()
            ]);
            return htmlspecialchars($dateString);
        }
    }

    /**
     * Validate that required files are present before allowing step completion
     */
    private function validateRequiredFiles($workflowStep, $request, $dossier, $formData)
    {
        \Log::info('Validating required files for step', [
            'step_id' => $workflowStep->id,
            'step_name' => $workflowStep->name,
            'step_number' => $workflowStep->step_number,
            'has_files' => $request->hasFile('files'),
            'form_data' => $formData
        ]);

        // Step 21 (DBCS): "Décision : Attestation reçue ?" - requires document when decision is YES
        if ($workflowStep->step_number === 21 &&
            $workflowStep->requires_decision &&
            str_contains($workflowStep->name, 'Attestation reçue')) {

            $decision = $request->boolean('decision');

            \Log::info('Step 21 validation - Attestation check', [
                'decision' => $decision,
                'has_files' => $request->hasFile('files'),
                'form_data' => $formData
            ]);

            // If decision is YES (attestation received), we MUST have a file
            if ($decision === true) {
                // Check if files were uploaded in this request
                $hasFilesInRequest = $request->hasFile('files');

                // Check if files are in form data (embedded uploads)
                $hasFilesInFormData = false;
                if ($formData && is_array($formData)) {
                    $hasFilesInFormData = $this->hasFilesInFormData($formData);
                }

                // For decision steps, also check if files were already uploaded in a previous form submission
                $hasExistingFiles = false;
                if (!$hasFilesInRequest && !$hasFilesInFormData) {
                    // For Step 21 (DBCS), check for any user-uploaded files in the dossier
                    // Since files might be uploaded to different steps but should be valid for this decision
                    $existingAttachments = $dossier->attachments()
                        ->where('is_generated', false) // Only user-uploaded files
                        ->count();

                    $hasExistingFiles = $existingAttachments > 0;

                    \Log::info('Step 21 validation - Checking existing files', [
                        'step_id' => $workflowStep->id,
                        'step_name' => $workflowStep->name,
                        'existing_attachments_count' => $existingAttachments,
                        'has_existing_files' => $hasExistingFiles,
                        'all_attachments_for_dossier' => $dossier->attachments()->where('is_generated', false)->pluck('workflow_step_id')->toArray(),
                        'all_attachment_names' => $dossier->attachments()->where('is_generated', false)->pluck('file_name')->toArray()
                    ]);
                }

                if (!$hasFilesInRequest && !$hasFilesInFormData && !$hasExistingFiles) {
                    \Log::error('Step 21 validation failed: No attestation document uploaded', [
                        'step_id' => $workflowStep->id,
                        'decision' => $decision,
                        'has_files_request' => $hasFilesInRequest,
                        'has_files_form_data' => $hasFilesInFormData,
                        'has_existing_files' => $hasExistingFiles
                    ]);

                    $validator = validator([], []);
                    $validator->errors()->add('files', 'L\'attestation Consuel est requise lorsque vous confirmez l\'avoir reçue. Veuillez uploader le document.');

                    throw new \Illuminate\Validation\ValidationException(
                        $validator,
                        response()->json([
                            'message' => 'Validation échouée',
                            'errors' => [
                                'files' => ['L\'attestation Consuel est requise lorsque vous confirmez l\'avoir reçue. Veuillez uploader le document.']
                            ]
                        ], 422)
                    );
                }

                \Log::info('Step 21 validation passed: Attestation document present', [
                    'has_files_request' => $hasFilesInRequest,
                    'has_files_form_data' => $hasFilesInFormData,
                    'has_existing_files' => $hasExistingFiles
                ]);
            }
        }

        // Add more step-specific file requirements here as needed
        // Example: Step X requires photos, Step Y requires signed contract, etc.
    }

    /**
     * Check if there are file uploads in the form data array
     */
    private function hasFilesInFormData($formData)
    {
        if (!is_array($formData)) {
            return false;
        }

        foreach ($formData as $key => $value) {
            // Check if value is a file object
            if ($value instanceof \Illuminate\Http\UploadedFile) {
                return true;
            }

            // Recursively check nested arrays
            if (is_array($value) && $this->hasFilesInFormData($value)) {
                return true;
            }
        }

        return false;
    }

    public function saveWorkflowFormData(Request $request)
    {
        try {
            \Log::info('Workflow form data save: Request received', [
                'user_id' => $request->user() ? $request->user()->id : 'null',
                'content_type' => $request->header('Content-Type'),
                'has_files' => $request->hasFile('files') || $request->hasFile('documents'),
                'all_input' => $request->all()
            ]);

            // Check if this is FormData (multipart/form-data) or JSON
            $isFormData = str_contains($request->header('Content-Type'), 'multipart/form-data');

            $formData = null;
            if ($isFormData) {
                // For FormData, get all input except files
                $allInput = $request->all();
                $formData = $allInput;
                // Remove file fields from form data
                foreach ($allInput as $key => $value) {
                    if ($value instanceof \Illuminate\Http\UploadedFile) {
                        unset($formData[$key]);
                    }
                }
                \Log::info('Workflow form data save: FormData detected', [
                    'form_data_keys' => array_keys($formData ?? []),
                    'has_form_data' => !empty($formData)
                ]);
            } else {
                // Get form_data from JSON for backward compatibility
                $formData = $request->input('form_data');
                \Log::info('Workflow form data save: JSON detected', [
                    'form_data_type' => gettype($formData),
                    'form_data_keys' => is_array($formData) ? array_keys($formData) : null
                ]);
            }

            $validated = $request->validate([
                'dossier_id' => 'required|exists:dossiers,id',
                'workflow_step_id' => 'required|string',
            ]);

            // Convert workflow_step_id to string for consistency
            $stepId = (string)$validated['workflow_step_id'];

            // Handle legacy fallback-step-N strings - convert to real database IDs
            if (preg_match('/^fallback-step-(\d+)$/', $stepId, $matches)) {
                $stepIndex = (int)$matches[1];

                \Log::info('Converting fallback step to real step ID', [
                    'fallback_step' => $stepId,
                    'step_index' => $stepIndex
                ]);

                // Find the actual workflow step ID for this dossier's world and step number
                $dossier = \App\Models\Dossier::findOrFail($request->dossier_id);
                $template = \App\Models\WorkflowTemplate::where('world_id', $dossier->world_id)
                    ->where('is_active', true)->first();

                if ($template) {
                    $actualStep = $template->steps()->where('step_number', $stepIndex)->first();
                    if ($actualStep) {
                        $stepId = (string)$actualStep->id;
                        \Log::info('Successfully mapped fallback-step-' . $stepIndex . ' to real step ID: ' . $actualStep->id, [
                            'step_name' => $actualStep->name
                        ]);
                    } else {
                        \Log::error('No real step found for fallback-step-' . $stepIndex . ' in template ' . $template->id);
                        return response()->json([
                            'message' => 'Validation failed',
                            'errors' => ['workflow_step_id' => ['No matching workflow step found.']]
                        ], 422);
                    }
                } else {
                    \Log::error('No workflow template found for dossier world: ' . $dossier->world_id);
                    return response()->json([
                        'message' => 'Validation failed',
                        'errors' => ['workflow_step_id' => ['No workflow template configured.']]
                    ], 422);
                }

                // Update the request with the mapped step ID
                $validated['workflow_step_id'] = $stepId;
                $request->merge(['workflow_step_id' => $stepId]);
            }

            // Now validate that the final step ID exists in the database
            if (!\App\Models\WorkflowStep::where('id', $stepId)->exists()) {
                \Log::error('Workflow step not found in database', ['step_id' => $stepId]);
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => ['workflow_step_id' => ['The selected workflow step is invalid.']]
                ], 422);
            }

            $user = $request->user();
            if (!$user) {
                \Log::error('Workflow form data save: No authenticated user');
                return response()->json(['message' => 'Authentication required'], 401);
            }

            $dossier = \App\Models\Dossier::findOrFail($request->dossier_id);
            if (!$user->canAccessDossier($dossier)) {
                \Log::error('Workflow form data save: Unauthorized access', [
                    'user_id' => $user->id,
                    'dossier_id' => $request->dossier_id
                ]);
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            \Log::info('Workflow form data save: Processing step', [
                'dossier_id' => $request->dossier_id,
                'step_id' => $request->workflow_step_id
            ]);

            // Find or create progress record for this step
            $progress = DossierWorkflowProgress::with(['workflowStep', 'dossier.world'])
                ->where('dossier_id', $request->dossier_id)
                ->where('workflow_step_id', $request->workflow_step_id)
                ->first();

            if (!$progress) {
                // Create initial progress record if none exists
                $progress = DossierWorkflowProgress::create([
                    'dossier_id' => $request->dossier_id,
                    'workflow_step_id' => $request->workflow_step_id,
                    'status' => 'in_progress',
                    'assigned_to' => $dossier->owner_id,
                    'form_data' => '{}',
                ]);
                \Log::info('Workflow form data save: Created initial progress', ['progress_id' => $progress->id]);
            }

            // Process file uploads if any files were submitted
            $uploadedFiles = [];
            if ($request->hasFile('files')) {
                \Log::info('Workflow form data save: Processing files from request->files', [
                    'files_count' => count($request->file('files')),
                    'file_names' => array_map(function($file) {
                        return $file ? $file->getClientOriginalName() : 'null';
                    }, $request->file('files'))
                ]);
                $uploadedFiles = $this->processFileUploads($request->file('files'), $dossier, $progress->workflowStep, $user);
                \Log::info('Workflow form data save: File uploads processed', [
                    'uploaded_files_count' => count($uploadedFiles),
                    'uploaded_file_ids' => array_map(function($file) { return $file->id ?? 'no_id'; }, $uploadedFiles)
                ]);
            } else {
                \Log::info('Workflow form data save: No files in request->files');
            }

            // For FormData requests, check ALL input fields for uploaded files
            if ($isFormData) {
                \Log::info('Workflow form data save: Processing FormData files', [
                    'all_input_keys' => array_keys($request->all()),
                    'has_file_keys' => array_filter(array_keys($request->all()), function($key) use ($request) {
                        return $request->hasFile($key);
                    })
                ]);

                // Check all fields for files
                foreach ($request->all() as $fieldName => $fieldValue) {
                    if ($request->hasFile($fieldName)) {
                        $files = $request->file($fieldName);
                        if (is_array($files)) {
                            \Log::info('Workflow form data save: Found file array', [
                                'field_name' => $fieldName,
                                'files_count' => count($files),
                                'file_names' => array_map(function($file) {
                                    return $file ? $file->getClientOriginalName() : 'null';
                                }, $files)
                            ]);
                            $fieldFiles = $this->processFileUploads($files, $dossier, $progress->workflowStep, $user);
                        } elseif ($files instanceof \Illuminate\Http\UploadedFile) {
                            \Log::info('Workflow form data save: Found single file', [
                                'field_name' => $fieldName,
                                'file_name' => $files->getClientOriginalName()
                            ]);
                            $fieldFiles = $this->processSingleFile($files, $dossier, $progress->workflowStep, $user, $fieldName);
                        } else {
                            $fieldFiles = [];
                        }
                        $uploadedFiles = array_merge($uploadedFiles, $fieldFiles);
                    }
                }

                \Log::info('Workflow form data save: All FormData files processed', [
                    'total_uploaded_files' => count($uploadedFiles),
                    'total_file_ids' => array_map(function($file) { return $file->id ?? 'no_id'; }, $uploadedFiles)
                ]);
            }

            // Store form data if provided (use the extracted form_data, not $request->form_data)
            if ($formData) {
                // Remove file objects from form data before JSON encoding
                $cleanFormData = $this->cleanFormDataForJson($formData);
                $progress->update([
                    'form_data' => json_encode($cleanFormData),
                    'status' => 'in_progress' // Ensure it stays in progress
                ]);
                \Log::info('Workflow form data save: Saving form data', [
                    'form_data_to_save' => $cleanFormData,
                    'json_encoded' => json_encode($cleanFormData)
                ]);
            } else {
                // Just update status to in_progress if no form data
                $progress->update(['status' => 'in_progress']);
                \Log::info('Workflow form data save: No form data to save, updated status to in_progress');
            }

            \Log::info('Workflow form data save: Success', [
                'progress_id' => $progress->id,
                'dossier_id' => $request->dossier_id,
                'step_id' => $request->workflow_step_id,
                'status' => $progress->status
            ]);

            return response()->json([
                'message' => 'Form data saved successfully',
                'progress' => $progress->load('workflowStep')
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Workflow form data save validation error', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            \Log::error('Workflow form data save unexpected error', [
                'error' => $e->getMessage(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'message' => 'Internal server error',
                'error' => env('APP_DEBUG') ? $e->getMessage() : 'Please contact support'
            ], 500);
        }
    }

    /**
     * Rollback a workflow step to pending status
     */
    public function rollbackWorkflowStep(Request $request, $dossierId, $stepId)
    {
        try {
            $request->validate([
                'reason' => 'required|string|max:500',
            ]);

            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Authentication required'], 401);
            }

            $dossier = \App\Models\Dossier::findOrFail($dossierId);
            if (!$user->canAccessDossier($dossier)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            // Find the workflow progress record
            $progress = DossierWorkflowProgress::with(['workflowStep', 'dossier.world'])
                ->where('dossier_id', $dossierId)
                ->where('workflow_step_id', $stepId)
                ->first();

            if (!$progress) {
                return response()->json([
                    'message' => 'Workflow step progress not found'
                ], 404);
            }

            // Check if rollback is allowed
            if (!$progress->canBeRolledBack()) {
                return response()->json([
                    'message' => 'This workflow step cannot be rolled back',
                    'reason' => 'Step is not completed, already rolled back, or is a final step'
                ], 422);
            }

            // Perform the rollback
            $progress->rollback($request->reason, $user->id);

            // Also rollback any subsequent steps that depend on this one
            $this->rollbackSubsequentSteps($progress, $request->reason, $user->id);

            // Create workflow history entry
            $dossier->workflowHistory()->create([
                'action' => 'rollback',
                'workflow_step_id' => $stepId,
                'old_status' => 'completed',
                'new_status' => 'pending',
                'performed_by' => $user->id,
                'notes' => $request->reason,
                'metadata' => [
                    'reason' => $request->reason,
                    'rolled_back_at' => now(),
                    'rollback_count' => $progress->rollback_count
                ]
            ]);

            \Log::info('Workflow step rolled back successfully', [
                'dossier_id' => $dossierId,
                'step_id' => $stepId,
                'step_name' => $progress->workflowStep->name,
                'user_id' => $user->id,
                'reason' => $request->reason
            ]);

            return response()->json([
                'message' => 'Workflow step rolled back successfully',
                'progress' => $progress->load('workflowStep'),
                'rollback_info' => $progress->getRollbackHistory()
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Workflow rollback failed', [
                'dossier_id' => $dossierId,
                'step_id' => $request->input('step_id'),
                'error' => $e->getMessage(),
                'user_id' => $request->user() ? $request->user()->id : null
            ]);

            return response()->json([
                'message' => 'Internal server error',
                'error' => env('APP_DEBUG') ? $e->getMessage() : 'Please contact support'
            ], 500);
        }
    }

    /**
     * Get rollback history for a specific workflow step
     */
    public function getStepRollbackHistory(Request $request, $dossierId, $stepId)
    {

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Authentication required'], 401);
        }

        $dossier = \App\Models\Dossier::findOrFail($dossierId);
        if (!$user->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $progress = DossierWorkflowProgress::where('dossier_id', $dossierId)
            ->where('workflow_step_id', $stepId)
            ->first();

        if (!$progress) {
            return response()->json([
                'message' => 'Workflow step progress not found'
            ], 404);
        }

        return response()->json([
            'rollback_history' => $progress->getRollbackHistory(),
            'step_info' => [
                'id' => $progress->workflow_step_id,
                'name' => $progress->workflowStep->name,
                'number' => $progress->workflowStep->step_number,
                'status' => $progress->status
            ]
        ]);
    }

    /**
     * Check if a workflow step can be rolled back
     */
    public function canRollbackStep(Request $request, $dossierId, $stepId)
    {

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Authentication required'], 401);
        }

        $dossier = \App\Models\Dossier::findOrFail($dossierId);
        if (!$user->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $progress = DossierWorkflowProgress::where('dossier_id', $dossierId)
            ->where('workflow_step_id', $stepId)
            ->first();

        if (!$progress) {
            return response()->json([
                'can_rollback' => false,
                'reason' => 'Workflow step progress not found'
            ]);
        }

        $canRollback = $progress->canBeRolledBack();

        return response()->json([
            'can_rollback' => $canRollback,
            'reason' => $canRollback ? null : $this->getRollbackPreventionReason($progress),
            'step_info' => [
                'id' => $progress->workflow_step_id,
                'name' => $progress->workflowStep->name,
                'number' => $progress->workflowStep->step_number,
                'status' => $progress->status,
                'completed_at' => $progress->completed_at,
                'rolled_back_at' => $progress->rolled_back_at
            ]
        ]);
    }

    /**
     * Rollback subsequent steps that depend on the rolled back step
     */
    private function rollbackSubsequentSteps($rolledBackProgress, $reason, $userId)
    {
        $currentStep = $rolledBackProgress->workflowStep;
        $dossierId = $rolledBackProgress->dossier_id;

        // Find all steps that come after this one in the workflow
        $subsequentSteps = DossierWorkflowProgress::with('workflowStep')
            ->where('dossier_id', $dossierId)
            ->whereHas('workflowStep', function($query) use ($currentStep) {
                $query->where('step_number', '>', $currentStep->step_number);
            })
            ->where('status', 'completed') // Only rollback completed steps
            ->whereNull('rolled_back_at') // Don't rollback already rolled back steps
            ->join('workflow_steps', 'dossier_workflow_progress.workflow_step_id', '=', 'workflow_steps.id')
            ->orderBy('workflow_steps.step_number')
            ->select('dossier_workflow_progress.*')
            ->get();

        foreach ($subsequentSteps as $subsequentProgress) {
            // Only rollback if it's not a final step
            $finalSteps = [27, 14, 30]; // JDE final, JDMO final, DBCS final
            if (!in_array($subsequentProgress->workflowStep->step_number, $finalSteps)) {
                $subsequentProgress->rollback(
                    "Automatic rollback due to rollback of step {$currentStep->step_number} ({$currentStep->name}): {$reason}",
                    $userId
                );

                \Log::info('Subsequent step automatically rolled back', [
                    'original_step_id' => $currentStep->id,
                    'original_step_name' => $currentStep->name,
                    'rolled_back_step_id' => $subsequentProgress->workflow_step_id,
                    'rolled_back_step_name' => $subsequentProgress->workflowStep->name,
                    'dossier_id' => $dossierId,
                    'reason' => $reason
                ]);
            }
        }
    }

    /**
     * Get the reason why a step cannot be rolled back
     */
    private function getRollbackPreventionReason($progress)
    {
        if ($progress->rolled_back_at) {
            return 'Step has already been rolled back';
        }

        if (!$progress->isCompleted()) {
            return 'Step is not completed';
        }

        $finalSteps = [27, 14, 30]; // JDE final, JDMO final, DBCS final
        if (in_array($progress->workflowStep->step_number, $finalSteps)) {
            return 'Cannot rollback final workflow steps';
        }

        return 'Unknown reason';
    }
}
