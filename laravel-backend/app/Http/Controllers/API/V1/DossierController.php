<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\Dossier;
use App\Models\DossierClientInfo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;

class DossierController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $world = $request->get('world');
        $status = $request->get('status');
        $search = $request->get('search');

        $query = Dossier::with(['world', 'owner.profile', 'clientInfo']);

        // Filter by worlds user has access to
        $worldIds = $request->user()->worldAccess()->pluck('worlds.id');
        $query->whereIn('world_id', $worldIds);

        if ($world) {
            $query->whereHas('world', function ($q) use ($world) {
                $q->where('code', $world);
            });
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('reference', 'ilike', "%{$search}%");
            });
        }

        $dossiers = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'dossiers' => $dossiers->map(function ($dossier) {
                return $this->formatDossier($dossier);
            }),
                'pagination' => [
                    'current_page' => $dossiers->currentPage(),
                    'last_page' => $dossiers->lastPage(),
                    'per_page' => $dossiers->perPage(),
                    'total' => $dossiers->total(),
                ]
        ]);
    }

    public function getPhotos(Request $request, Dossier $dossier)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $photos = $dossier->attachments()
            ->where('file_type', 'like', 'image/%')
            ->with('uploader.profile')
            ->latest()
            ->get()
            ->map(function ($attachment) {
                $metatype = $attachment->metadata['type'] ?? 'photo'; // Default to 'photo' if not specified
                return [
                    'id' => $attachment->id,
                    'file_name' => $attachment->file_name,
                    'file_type' => $attachment->file_type,
                    'file_size' => $attachment->file_size,
                    'storage_path' => $attachment->storage_path,
                    // Add direct URL for frontend convenience
                    'url' => Storage::url($attachment->storage_path),
                    'caption' => '',
                    'taken_at' => $attachment->created_at,
                    'uploaded_by' => $attachment->uploaded_by,
                    'created_at' => $attachment->created_at,
                    'metadata' => $attachment->metadata,
                    'uploader' => [
                        'display_name' => $attachment->uploader?->profile?->display_name ?? $attachment->uploader?->name ?? 'Utilisateur',
                    ],
                ];
            });

        return response()->json(['photos' => $photos]);
    }

    public function uploadPhoto(Request $request, Dossier $dossier)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'files' => 'required|array|max:10', // Max 10 files
            'files.*' => 'required|image|max:20480', // Max 20MB, images only
            'type' => 'required|in:photo,plan',
        ]);

        // Get the last completed step before the current active step (for proper timeline positioning)
        $previousSteps = $dossier->workflowProgress()
            ->with('workflowStep')
            ->where('status', 'completed')
            ->join('workflow_steps', 'workflow_steps.id', '=', 'dossier_workflow_progress.workflow_step_id')
            ->orderBy('workflow_steps.step_number', 'desc')
            ->first();

        $uploadedPhotos = [];
        $files = $request->file('files');

        foreach ($files as $file) {
            $path = $file->store("dossier-photos/{$dossier->id}", 'public');

            $photo = $dossier->attachments()->create([
                'workflow_step_id' => $previousSteps?->workflow_step_id,
                'file_name' => $file->getClientOriginalName(),
                'file_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'storage_path' => $path,
                'document_type' => 'photo',
                'uploaded_by' => $request->user()->id,
                'is_generated' => false,
                'metadata' => [
                    'type' => $request->type,
                    'description' => $request->description ?? '',
                ],
            ]);

            $uploadedPhotos[] = [
                'id' => $photo->id,
                'file_name' => $photo->file_name,
                'file_type' => $photo->file_type,
                'file_size' => $photo->file_size,
                'storage_path' => $photo->storage_path,
                'caption' => '',
                'taken_at' => $photo->created_at,
                'uploaded_by' => $photo->uploaded_by,
                'created_at' => $photo->created_at,
                'metadata' => $photo->metadata,
                'uploader' => [
                    'display_name' => $request->user()->profile?->display_name ?? $request->user()->name,
                ],
            ];
        }

        return response()->json([
            'message' => count($uploadedPhotos) . ' photo(s) uploaded successfully',
            'photos' => $uploadedPhotos
        ], 201);
    }

    public function deletePhoto(Request $request, Dossier $dossier, $photoId)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $photo = $dossier->attachments()->findOrFail($photoId);

        // Only allow deletion by the uploader or admin
        if ($photo->uploaded_by !== $request->user()->id && !$request->user()->hasRole('superadmin')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Delete from storage
        Storage::disk('public')->delete($photo->storage_path);

        // Delete from database
        $photo->delete();

        return response()->json(['message' => 'Photo deleted successfully']);
    }

    public function previewPhoto(Request $request, Dossier $dossier, $photoId)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $photo = $dossier->attachments()->findOrFail($photoId);

        $publicUrl = Storage::url($photo->storage_path);

        return response()->json([
            'url' => $publicUrl,
            'file_name' => $photo->file_name,
            'file_type' => $photo->file_type,
            'file_size' => $photo->file_size,
        ]);
    }

    public function downloadPhoto(Request $request, Dossier $dossier, $photoId)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $photo = $dossier->attachments()->findOrFail($photoId);

        $file = Storage::disk('public')->get($photo->storage_path);

        return response($file, 200, [
            'Content-Type' => $photo->file_type,
            'Content-Disposition' => 'attachment; filename="' . $photo->file_name . '"',
        ]);
    }

    public function downloadDossier(Request $request, Dossier $dossier)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Generate ZIP file containing all dossier files
        $zipFileName = 'dossier_' . $dossier->reference . '_' . date('Y-m-d_H-i-s') . '.zip';
        $zipPath = storage_path('app/temp/' . $zipFileName);

        // Ensure temp directory exists
        if (!is_dir(dirname($zipPath))) {
            mkdir(dirname($zipPath), 0755, true);
        }

        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE) !== true) {
            return response()->json(['message' => 'Could not create ZIP file'], 500);
        }

        // Generate PDF client fiche
        try {
            $pdfContent = $this->generateClientFichePdf($dossier);
            $zip->addFromString('fiche_client.pdf', $pdfContent);
        } catch (\Exception $e) {
            // Continue without PDF if generation fails
            \Log::warning('Failed to generate client fiche PDF: ' . $e->getMessage());
        }

        // Add all attachments - separate by type
        $attachments = $dossier->attachments()->where('is_generated', false)->get();

        foreach ($attachments as $attachment) {
            $filePath = Storage::disk('public')->path($attachment->storage_path);
            if (file_exists($filePath)) {
                // Separate images from documents
                $isImage = str_starts_with($attachment->file_type, 'image/');
                $folder = $isImage ? 'photos/' : 'documents/';

                try {
                    $zip->addFile($filePath, $folder . $attachment->file_name);
                } catch (\Exception $e) {
                    // Continue if one file fails
                    \Log::warning('Failed to add file to ZIP: ' . $attachment->file_name . ' - ' . $e->getMessage());
                    continue;
                }
            }
        }

        // Add administrative documents (if any exist)
        $adminDocs = $dossier->administrativeDocuments()->with('attachment')->get();
        foreach ($adminDocs as $adminDoc) {
            if ($adminDoc->attachment) {
                $filePath = Storage::disk('public')->path($adminDoc->attachment->storage_path);
                if (file_exists($filePath)) {
                    try {
                        $zip->addFile($filePath, 'documents_administratifs/' . $adminDoc->document_label . '_' . $adminDoc->attachment->file_name);
                    } catch (\Exception $e) {
                        \Log::warning('Failed to add admin doc to ZIP: ' . $adminDoc->attachment->file_name . ' - ' . $e->getMessage());
                        continue;
                    }
                }
            }
        }

        $zip->close();

        // Return ZIP file for download
        if (!file_exists($zipPath)) {
            return response()->json(['message' => 'ZIP file generation failed'], 500);
        }

        $zipContent = file_get_contents($zipPath);

        // Clean up temp file
        unlink($zipPath);

        return response($zipContent, 200, [
            'Content-Type' => 'application/zip',
            'Content-Disposition' => 'attachment; filename="' . $zipFileName . '"',
        ]);
    }

    public function show(Request $request, Dossier $dossier)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $dossier->load([
            'world',
            'owner.profile',
            'clientInfo',
            'workflowProgress.workflowStep',
            'comments.user.profile',
            'attachments.uploader.profile'
        ]);

        return response()->json([
            'dossier' => $this->formatDossier($dossier, true)
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'world_id' => 'required|exists:worlds,id',
            'title' => 'required|string|max:255',
            'tags' => 'nullable|array',
        ]);

        // Check if user has access to the world
        $world = \App\Models\World::findOrFail($request->world_id);
        if (!$request->user()->hasWorldAccess($world->code)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $dossier = Dossier::create([
            'world_id' => $request->world_id,
            'owner_id' => $request->user()->id,
            'title' => $request->title,
            'tags' => $request->tags,
        ]);

        // Initialize workflow if template exists
        $this->initializeWorkflow($dossier);

        $dossier->load(['world', 'owner.profile']);

        return response()->json([
            'message' => 'Dossier created successfully',
            'dossier' => $this->formatDossier($dossier)
        ], 201);
    }

    public function update(Request $request, Dossier $dossier)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'status' => 'nullable|in:nouveau,en_cours,cloture',
            'tags' => 'nullable|array',
        ]);

        $dossier->update($request->only(['title', 'status', 'tags']));

        $dossier->load(['world', 'owner.profile', 'clientInfo']);

        return response()->json([
            'message' => 'Dossier updated successfully',
            'dossier' => $this->formatDossier($dossier)
        ]);
    }

    public function destroy(Request $request, Dossier $dossier)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $dossier->delete();

        return response()->json([
            'message' => 'Dossier deleted successfully'
        ]);
    }

    private function formatDossier(Dossier $dossier, $withDetails = false)
    {
        $data = [
            'id' => $dossier->id,
            'reference' => $dossier->reference,
            'title' => $dossier->title,
            'status' => $dossier->status,
            'tags' => $dossier->tags,
            'world' => [
                'id' => $dossier->world->id,
                'code' => $dossier->world->code,
                'name' => $dossier->world->name,
                'theme_colors' => $dossier->world->theme_colors,
            ],
            'owner' => [
                'id' => $dossier->owner->id,
                'name' => $dossier->owner->name,
                'email' => $dossier->owner->email,
                'display_name' => $dossier->owner->profile?->display_name ?? $dossier->owner->name,
            ],
            'client_info' => $dossier->clientInfo ? [
                'id' => $dossier->clientInfo->id,
                'client_type' => $dossier->clientInfo->client_type,
                'nom' => $dossier->clientInfo->nom,
                'prenom' => $dossier->clientInfo->prenom,
                'telephone' => $dossier->clientInfo->telephone,
                'email' => $dossier->clientInfo->email,
                'adresse_client' => $dossier->clientInfo->adresse_client,
                'adresse_sinistre' => $dossier->clientInfo->adresse_sinistre,
                'type_sinistre' => $dossier->clientInfo->type_sinistre,
                'date_sinistre' => $dossier->clientInfo->date_sinistre ?
                    \Carbon\Carbon::parse($dossier->clientInfo->date_sinistre)->format('Y-m-d') : null,
                'compagnie_assurance' => $dossier->clientInfo->compagnie_assurance,
                'numero_police' => $dossier->clientInfo->numero_police,
                'date_reception' => $dossier->clientInfo->date_reception ?
                    \Carbon\Carbon::parse($dossier->clientInfo->date_reception)->format('Y-m-d') : null,
                'origine' => $dossier->clientInfo->origine,
                // Map proprietor fields to frontend expected names
                'proprietaire_nom' => $dossier->clientInfo->nom_proprietaire,
                'proprietaire_prenom' => $dossier->clientInfo->prenom_proprietaire,
                'proprietaire_telephone' => $dossier->clientInfo->telephone_proprietaire,
                'proprietaire_email' => $dossier->clientInfo->email_proprietaire,
                'proprietaire_adresse' => $dossier->clientInfo->adresse_proprietaire,
                // New shared fields for DBCS and JDMO
                'nom_societe' => $dossier->clientInfo->nom_societe,
                'adresse_facturation' => $dossier->clientInfo->adresse_facturation,
                'travaux_suite_sinistre' => $dossier->clientInfo->travaux_suite_sinistre,
                'type_proprietaire' => $dossier->clientInfo->type_proprietaire,
                'origine_dossier' => $dossier->clientInfo->origine_dossier,
                'numero_dossier_jde' => $dossier->clientInfo->numero_dossier_jde,
                'references_devis_travaux' => $dossier->clientInfo->references_devis_travaux,
                'nature_travaux' => $dossier->clientInfo->nature_travaux,
                'numero_permis_construire' => $dossier->clientInfo->numero_permis_construire,
                'numero_declaration_prealable' => $dossier->clientInfo->numero_declaration_prealable,
                // DBCS specific fields
                'adresse_realisation_travaux' => $dossier->clientInfo->adresse_realisation_travaux,
                'branchement_provisoire' => $dossier->clientInfo->branchement_provisoire,
                'occupation_voirie' => $dossier->clientInfo->occupation_voirie,
                // JDMO specific fields
                'adresse_realisation_missions' => $dossier->clientInfo->adresse_realisation_missions,
                'modification_plan' => $dossier->clientInfo->modification_plan,
            ] : null,
            'created_at' => $dossier->created_at,
            'updated_at' => $dossier->updated_at,
        ];

        if ($withDetails) {
            $data['workflow_progress'] = $dossier->getCurrentWorkflowSteps()->map(function ($progress) {
                return [
                    'id' => $progress->id,
                    'status' => $progress->status,
                    'step' => $progress->workflowStep ? [
                        'id' => $progress->workflowStep->id,
                        'name' => $progress->workflowStep->name,
                        'step_type' => $progress->workflowStep->step_type,
                    ] : [
                        // Fallback step info for steps not in database
                        'id' => $progress->workflow_step_id,
                        'name' => $this->getFallbackStepName($progress->workflow_step_id),
                        'step_type' => 'action',
                    ],
                ];
            });
            $data['attachments_count'] = $dossier->attachments()->count();
            $data['comments_count'] = $dossier->comments()->count();
        }

        return $data;
    }

    public function uploadAttachment(Request $request, Dossier $dossier)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
        $request->validate([
            'file' => 'required|file|max:51200', // 50MB max for audio files
            'description' => 'nullable|string',
            'document_type' => 'nullable|string',
            'workflow_step_id' => 'nullable|string',
        ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
                'received_data' => [
                    'has_file' => $request->hasFile('file'),
                    'file_size' => $request->hasFile('file') ? $request->file('file')->getSize() : null,
                    'all_input' => $request->all(),
                    'files' => $request->allFiles(),
                ]
            ], 422);
        }

        // Get the last completed step before the current active step (for proper timeline positioning)
        $previousSteps = $dossier->workflowProgress()
            ->with('workflowStep')
            ->where('status', 'completed')
            ->join('workflow_steps', 'workflow_steps.id', '=', 'dossier_workflow_progress.workflow_step_id')
            ->orderBy('workflow_steps.step_number', 'desc')
            ->first();

        $file = $request->file('file');
        $path = $file->store("dossier-attachments/{$dossier->id}", 'public');

        $attachment = $dossier->attachments()->create([
            'workflow_step_id' => $request->workflow_step_id ?: $previousSteps?->workflow_step_id,
            'file_name' => $file->getClientOriginalName(),
            'file_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'storage_path' => $path,
            'document_type' => $request->document_type ?: 'upload',
            'uploaded_by' => $request->user()->id,
            'is_generated' => false,
            'metadata' => [],
        ]);

        return response()->json([
            'message' => 'Attachment uploaded successfully',
            'attachment' => $attachment->load('uploader.profile')
        ], 201);
    }

    public function getAttachments(Request $request, Dossier $dossier)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $attachments = $dossier->attachments()->with('uploader.profile')->get();

        return response()->json(['attachments' => $attachments]);
    }

    public function deleteAttachment(Request $request, Dossier $dossier, $attachmentId)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $attachment = $dossier->attachments()->findOrFail($attachmentId);

        // Only allow deletion by the uploader
        if ($attachment->uploaded_by !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Delete from storage
        Storage::disk('public')->delete($attachment->storage_path);

        // Delete from database
        $attachment->delete();

        return response()->json(['message' => 'Attachment deleted successfully']);
    }

    public function downloadAttachment(Request $request, Dossier $dossier, $attachmentId)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $attachment = $dossier->attachments()->findOrFail($attachmentId);

        $file = Storage::disk('public')->get($attachment->storage_path);

        return response($file, 200, [
            'Content-Type' => $attachment->file_type,
            'Content-Disposition' => 'attachment; filename="' . $attachment->file_name . '"',
        ]);
    }

    public function previewAttachment(Request $request, Dossier $dossier, $attachmentId)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $attachment = $dossier->attachments()->findOrFail($attachmentId);

        $file = Storage::disk('public')->get($attachment->storage_path);

        return response($file, 200, [
            'Content-Type' => $attachment->file_type,
            'Content-Disposition' => 'inline; filename="' . $attachment->file_name . '"',
            'Content-Security-Policy' => "default-src 'self'",
        ]);
    }

    public function addComment(Request $request, Dossier $dossier)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'comment' => 'required|string',
            'comment_type' => 'required|in:comment,status_change,assignment',
            'metadata' => 'nullable|array',
        ]);

        $comment = $dossier->comments()->create([
            'user_id' => $request->user()->id,
            'comment_type' => $request->comment_type,
            'content' => $request->comment,
            'metadata' => $request->metadata ?: [],
        ]);

        return response()->json([
            'message' => 'Comment added successfully',
            'comment' => $comment->load('user.profile')
        ]);
    }

    public function comments(Dossier $dossier)
    {
        if (!request()->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $comments = $dossier->comments()->with('user')->orderBy('created_at')->get();

        // Transform comments to include user display info
        $comments = $comments->map(function ($comment) {
            return [
                'id' => $comment->id,
                'dossier_id' => $comment->dossier_id,
                'user_id' => $comment->user_id,
                'comment_type' => $comment->comment_type,
                'content' => $comment->content,
                'metadata' => $comment->metadata,
                'created_at' => $comment->created_at,
                'updated_at' => $comment->updated_at,
                'user' => [
                    'id' => $comment->user->id,
                    'email' => $comment->user->email,
                    'profile' => [
                        'display_name' => $comment->user->profile?->display_name ?? $comment->user->name,
                    ]
                ]
            ];
        });

        return response()->json(['comments' => $comments]);
    }

    public function updateClientInfo(Request $request, Dossier $dossier)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'client_type' => 'required|in:locataire,proprietaire,proprietaire_non_occupant,professionnel',
            'nom' => 'nullable|string|max:255',
            'prenom' => 'nullable|string|max:255',
            'telephone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'adresse_sinistre' => 'nullable|string',
            'type_sinistre' => 'nullable|string',
            'date_sinistre' => 'nullable|date',
            'compagnie_assurance' => 'nullable|string',
            'numero_police' => 'nullable|string',
            'date_reception' => 'nullable|date',
            'origine' => 'nullable|string|max:255',
            // Owner fields for tenants
            'proprietaire_nom' => 'nullable|string|max:255',
            'proprietaire_prenom' => 'nullable|string|max:255',
            'proprietaire_telephone' => 'nullable|string|max:20',
            'proprietaire_email' => 'nullable|email|max:255',
            'proprietaire_adresse' => 'nullable|string',
        ]);

        // Save client info with world_id from dossier and all provided fields
        $clientInfo = $dossier->clientInfo()->updateOrCreate(
            [],
            array_merge($request->all(), [
                'world_id' => $dossier->world_id, // Automatically set world_id from dossier
                'metadata' => []
            ])
        );

        return response()->json([
            'message' => 'Client info updated successfully',
            'client_info' => $clientInfo
        ]);
    }

    public function getClientInfo(Request $request, Dossier $dossier)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $clientInfo = $dossier->clientInfo;

        return response()->json(['client_info' => $clientInfo]);
    }

    public function getWorkflow(Dossier $dossier)
    {
        if (!request()->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Ensure Step 1 has a progress record with pre-populated data if client info exists
        $progress = $dossier->workflowProgress()->with('workflowStep')->get();

        if ($dossier->clientInfo) {
            $step1Progress = $progress->firstWhere('workflowStep.step_number', 1);

            if (!$step1Progress) {
                // Create new progress record for Step 1
                $template = $dossier->world->workflowTemplates()->where('is_active', true)->first();
                if ($template) {
                    $step1 = $template->steps()->where('step_number', 1)->first();
                    if ($step1) {
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

                        DossierWorkflowProgress::create([
                            'dossier_id' => $dossier->id,
                            'workflow_step_id' => $step1->id,
                            'status' => 'pending',
                            'assigned_to' => $dossier->owner_id,
                            'form_data' => $initialFormData,
                        ]);

                        // Reload progress to include the new record
                        $progress = $dossier->workflowProgress()->with('workflowStep')->get();
                    }
                }
            } elseif ($step1Progress->form_data === '{}' || $step1Progress->form_data === '[]' || $step1Progress->form_data === null || $step1Progress->form_data === '') {
                // Update existing progress record if form_data is empty or null
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
                    'date_reception' => $clientInfo->date_reception ? $clientInfo->date_reception->format('Y-m-d') : null,
                    'origine' => $clientInfo->origine ?? '',
                    'proprietaire_nom' => $clientInfo->nom_proprietaire ?? '',
                    'proprietaire_prenom' => $clientInfo->prenom_proprietaire ?? '',
                    'proprietaire_telephone' => $clientInfo->telephone_proprietaire ?? '',
                    'proprietaire_email' => $clientInfo->email_proprietaire ?? '',
                    'proprietaire_adresse' => $clientInfo->adresse_proprietaire ?? '',
                ]);

                $step1Progress->update(['form_data' => $initialFormData]);
                // Reload progress to include the updated record
                $progress = $dossier->workflowProgress()->with('workflowStep')->get();
            }
        }

        $workflow = $dossier->getWorkflowData();

        return response()->json(['workflow' => $workflow]);
    }

    public function getWorkflowHistory(Dossier $dossier)
    {
        if (!request()->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $history = $dossier->workflowHistory()->with('user.profile')->get();

        return response()->json(['history' => $history]);
    }

    public function timeline(Request $request, Dossier $dossier)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get workflow data
        $workflowData = $dossier->getWorkflowData();

        // Get user IDs that need profile data
        $userIds = collect();

        // Include current user
        $userIds->push($request->user()->id);

        // Get users from workflow progress, comments, annotations, tasks, appointments
        $progressUsers = $dossier->workflowProgress()->pluck('assigned_to')->filter();
        $commentUsers = $dossier->comments()->pluck('user_id')->filter();
        $annotationUsers = \App\Models\DossierStepAnnotation::where('dossier_id', $dossier->id)->pluck('created_by')->filter();

        // Optional: Tasks users (may not exist)
        $taskUsers = collect();
        try {
            $taskUsers = \App\Models\Task::whereIn('workflow_step_id',
                $dossier->workflowProgress()->pluck('workflow_step_id')
            )->pluck('created_by', 'assigned_to')->flatten()->filter();
        } catch (\Exception $e) {
            // Tasks may not be implemented yet, skip
            $taskUsers = collect();
        }

        // Optional: Appointments users (may not exist)
        $appointmentUsers = collect();
        try {
            $appointmentUsers = $dossier->appointments()->pluck('user_id')->filter();
        } catch (\Exception $e) {
            // Appointments may not be implemented yet, skip
            $appointmentUsers = collect();
        }

        $userIds = $userIds->merge([$progressUsers, $commentUsers, $annotationUsers, $taskUsers, $appointmentUsers])
            ->flatten()->unique()->values();

        // Get user profiles
        $userProfiles = \App\Models\User::whereIn('id', $userIds)->with('profile')->get()
            ->mapWithKeys(function ($user) {
                return [$user->id => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'profile' => $user->profile ? [
                        'display_name' => $user->profile->display_name,
                        'avatar_url' => $user->profile->avatar_url,
                    ] : null,
                ]];
            });

        // Get workflow step IDs for filtering tasks and annotations
        $workflowStepIds = $dossier->workflowProgress()->pluck('workflow_step_id');

        // Build comprehensive timeline data
        $timeline = [
            'workflow' => $workflowData,
            'documents' => $dossier->attachments()->with('uploader.profile')->latest()->get()->map(function ($doc) {
                return [
                    'id' => $doc->id,
                    'file_name' => $doc->file_name,
                    'file_type' => $doc->file_type,
                    'file_size' => $doc->file_size,
                    'document_type' => $doc->document_type,
                    'created_at' => $doc->created_at,
                    'uploader' => $doc->uploader ? [
                        'id' => $doc->uploader->id,
                        'name' => $doc->uploader->name,
                        'email' => $doc->uploader->email,
                        'profile' => $doc->uploader->profile ? [
                            'display_name' => $doc->uploader->profile->display_name,
                            'avatar_url' => $doc->uploader->profile->avatar_url,
                        ] : null,
                    ] : null,
                ];
            }),
            'comments' => $dossier->comments()->with('user.profile')->latest()->get()->map(function ($comment) {
                return [
                    'id' => $comment->id,
                    'content' => $comment->content,
                    'comment_type' => $comment->comment_type,
                    'created_at' => $comment->created_at,
                    'user' => $comment->user ? [
                        'id' => $comment->user->id,
                        'email' => $comment->user->email,
                        'name' => $comment->user->name,
                        'profile' => $comment->user->profile ? [
                            'display_name' => $comment->user->profile->display_name,
                            'avatar_url' => $comment->user->profile->avatar_url,
                        ] : null,
                    ] : null,
                ];
            }),
            'tasks' => (function() {
                try {
                    return \App\Models\Task::whereIn('workflow_step_id', $workflowStepIds)
                        ->with(['creator.profile', 'assignee.profile'])->latest()->get()->map(function ($task) {
                            return [
                                'id' => $task->id,
                                'title' => $task->title,
                                'description' => $task->description,
                                'status' => $task->status,
                                'priority' => $task->priority,
                                'due_date' => $task->due_date,
                                'created_at' => $task->created_at,
                                'workflow_step_id' => $task->workflow_step_id,
                                'created_by' => $task->created_by,
                                'assigned_to' => $task->assigned_to,
                                'creator' => $task->creator ? [
                                    'id' => $task->creator->id,
                                    'name' => $task->creator->name,
                                    'email' => $task->creator->email,
                                    'profile' => $task->creator->profile ? [
                                        'display_name' => $task->creator->profile->display_name,
                                        'avatar_url' => $task->creator->profile->avatar_url,
                                    ] : null,
                                ] : null,
                                'assignee' => $task->assignee ? [
                                    'id' => $task->assignee->id,
                                    'name' => $task->assignee->name,
                                    'email' => $task->assignee->email,
                                    'profile' => $task->assignee->profile ? [
                                        'display_name' => $task->assignee->profile->display_name,
                                        'avatar_url' => $task->assignee->profile->avatar_url,
                                    ] : null,
                                ] : null,
                            ];
                        });
                } catch (\Exception $e) {
                    // Tasks may not be implemented yet, return empty array
                    return collect();
                }
            })(),
            'appointments' => (function() {
                try {
                    return $dossier->appointments()->with('user.profile')->latest()->get()->map(function ($appt) {
                        return [
                            'id' => $appt->id,
                            'title' => $appt->title,
                            'description' => $appt->description,
                            'status' => $appt->status,
                            'start_time' => $appt->start_time,
                            'location' => $appt->location,
                            'workflow_step_id' => $appt->workflow_step_id,
                            'user' => $appt->user ? [
                                'id' => $appt->user->id,
                                'name' => $appt->user->name,
                                'email' => $appt->user->email,
                                'profile' => $appt->user->profile ? [
                                    'display_name' => $appt->user->profile->display_name,
                                    'avatar_url' => $appt->user->profile->avatar_url,
                                ] : null,
                            ] : null,
                        ];
                    });
                } catch (\Exception $e) {
                    // Appointments may not be implemented yet, return empty array
                    return collect();
                }
            })(),
            'annotations' => \App\Models\DossierStepAnnotation::where('dossier_id', $dossier->id)
                ->with('creator.profile')->latest()->get()->map(function ($annotation) {
                    return [
                        'id' => $annotation->id,
                        'title' => $annotation->title,
                        'content' => $annotation->content,
                        'annotation_type' => $annotation->annotation_type,
                        'created_at' => $annotation->created_at,
                        'workflow_step_id' => $annotation->workflow_step_id,
                        'created_by' => $annotation->created_by,
                        'creator' => $annotation->creator ? [
                            'id' => $annotation->creator->id,
                            'name' => $annotation->creator->name,
                            'email' => $annotation->creator->email,
                            'profile' => $annotation->creator->profile ? [
                                'display_name' => $annotation->creator->profile->display_name,
                                'avatar_url' => $annotation->creator->profile->avatar_url,
                            ] : null,
                        ] : null,
                    ];
                }),
            'user_profiles' => $userProfiles,
        ];

        return response()->json($timeline);
    }

    public function transferHistory(Dossier $dossier)
    {
        if (!request()->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $transfers = $dossier->transfers()->with(['fromWorld', 'toWorld', 'initiatedBy.profile'])->get();

        return response()->json(['transfers' => $transfers]);
    }

    // Administrative Documents Management

    public function getAdministrativeDocuments(Request $request, Dossier $dossier)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get client type for required documents
        $clientType = $dossier->clientInfo?->client_type ?? 'locataire';

        // Get all administrative documents for this dossier
        $adminDocs = $dossier->administrativeDocuments()->get()->keyBy('document_type');

        // Get available document types for this client type
        $availableTypes = \App\Models\DossierAdministrativeDocument::getDocumentTypesForClient($clientType);

        // Build response with status for each required document
        $documents = [];
        foreach ($availableTypes as $docType) {
            $adminDoc = $adminDocs->get($docType);

            $documents[] = [
                'id' => $adminDoc?->id,
                'document_type' => $docType,
                'document_label' => \App\Models\DossierAdministrativeDocument::getDocumentLabel($docType),
                'status' => $adminDoc?->status ?? \App\Models\DossierAdministrativeDocument::STATUS_PENDING,
                'received' => in_array($adminDoc?->status, [\App\Models\DossierAdministrativeDocument::STATUS_RECEIVED, \App\Models\DossierAdministrativeDocument::STATUS_UPLOADED]),
                'uploaded' => $adminDoc?->status === \App\Models\DossierAdministrativeDocument::STATUS_UPLOADED,
                'attachment_id' => $adminDoc?->attachment_id,
                'attachment' => $adminDoc && $adminDoc->attachment ? [
                    'id' => $adminDoc->attachment->id,
                    'file_name' => $adminDoc->attachment->file_name,
                    'file_size' => $adminDoc->attachment->file_size,
                    'created_at' => $adminDoc->attachment->created_at,
                    'uploader' => [
                        'display_name' => $adminDoc->attachment->uploader?->profile?->display_name ?? $adminDoc->attachment->uploader?->name,
                    ]
                ] : null,
                'uploaded_at' => $adminDoc?->updated_at,
            ];
        }

        return response()->json([
            'documents' => $documents,
            'client_type' => $clientType,
        ]);
    }

    public function markAdminDocumentReceived(Request $request, Dossier $dossier, $documentType)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $dossier->administrativeDocuments()->updateOrCreate(
            ['document_type' => $documentType],
            [
                'status' => \App\Models\DossierAdministrativeDocument::STATUS_RECEIVED,
                'uploaded_by' => null,
                'attachment_id' => null,
                'document_label' => \App\Models\DossierAdministrativeDocument::getDocumentLabel($documentType),
            ]
        );

        return response()->json(['message' => 'Document marked as received']);
    }

    public function uploadAdminDocument(Request $request, Dossier $dossier, $documentType)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'file' => 'required|file|max:20480', // 20MB max
            'description' => 'nullable|string',
            'document_type' => 'required|string',
        ]);

        // Get the last completed step before the current active step (for proper timeline positioning)
        $previousSteps = $dossier->workflowProgress()
            ->with('workflowStep')
            ->where('status', 'completed')
            ->join('workflow_steps', 'workflow_steps.id', '=', 'dossier_workflow_progress.workflow_step_id')
            ->orderBy('workflow_steps.step_number', 'desc')
            ->first();

        // Upload the file first
        $file = $request->file('file');
        $path = $file->store("dossier-admin-documents/{$dossier->id}", 'public');

        $attachment = $dossier->attachments()->create([
            'workflow_step_id' => $previousSteps?->workflow_step_id,
            'file_name' => $file->getClientOriginalName(),
            'file_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'storage_path' => $path,
            'document_type' => $documentType,
            'uploaded_by' => $request->user()->id,
            'is_generated' => false,
            'metadata' => [],
        ]);

        // Update admin document status
        $dossier->administrativeDocuments()->updateOrCreate(
            ['document_type' => $documentType],
            [
                'status' => \App\Models\DossierAdministrativeDocument::STATUS_UPLOADED,
                'uploaded_by' => $request->user()->id,
                'attachment_id' => $attachment->id,
                'document_label' => \App\Models\DossierAdministrativeDocument::getDocumentLabel($documentType),
            ]
        );

        return response()->json([
            'message' => 'Administrative document uploaded successfully',
            'attachment' => $attachment->load('uploader.profile')
        ], 201);
    }

    public function removeAdminDocument(Request $request, Dossier $dossier, $documentType)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $adminDoc = $dossier->administrativeDocuments()->where('document_type', $documentType)->first();

        if (!$adminDoc) {
            return response()->json(['message' => 'Administrative document not found'], 404);
        }

        // Delete attachment if exists
        if ($adminDoc->attachment) {
            Storage::disk('public')->delete($adminDoc->attachment->storage_path);
            $adminDoc->attachment->delete();
        }

        // Delete admin document record
        $adminDoc->delete();

        return response()->json(['message' => 'Administrative document removed successfully']);
    }

    public function updateAdminDocumentStatus(Request $request, Dossier $dossier, $documentType)
    {
        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'status' => 'required|in:' . implode(',', [
                \App\Models\DossierAdministrativeDocument::STATUS_PENDING,
                \App\Models\DossierAdministrativeDocument::STATUS_RECEIVED,
                \App\Models\DossierAdministrativeDocument::STATUS_UPLOADED,
            ]),
            'remove_attachment' => 'nullable|boolean',
        ]);

        $adminDoc = $dossier->administrativeDocuments()->where('document_type', $documentType)->first();

        if (!$adminDoc) {
            return response()->json(['message' => 'Administrative document not found'], 404);
        }

        // If removing attachment
        if ($request->remove_attachment && $adminDoc->attachment) {
            Storage::disk('public')->delete($adminDoc->attachment->storage_path);
            $adminDoc->attachment->delete();
            $adminDoc->update([
                'attachment_id' => null,
                'uploaded_by' => null,
                'status' => \App\Models\DossierAdministrativeDocument::STATUS_PENDING,
            ]);
        } else {
            $adminDoc->update([
                'status' => $request->status,
            ]);
        }

        return response()->json(['message' => 'Administrative document status updated successfully']);
    }

    private function initializeWorkflow(Dossier $dossier)
    {
        $template = $dossier->world->workflowTemplates()->where('is_active', true)->first();

        if ($template && $firstStep = $template->getFirstStep()) {
            $dossier->workflowProgress()->create([
                'workflow_step_id' => $firstStep->id,
                'status' => 'pending',
                'assigned_to' => $dossier->owner_id,
            ]);
        }
    }

    // Helper method for fallback step names
    private function getFallbackStepName($stepId)
    {
        if (preg_match('/fallback-step-(\d+)/', $stepId, $matches)) {
            $stepIndex = (int)$matches[1];
            $names = [
                1 => 'Réception du dossier',
                2 => 'Analyse initiale',
                3 => 'Envoi Convention/Mandat',
                4 => 'Suivi de paiement',
                5 => 'Finalisation',
                6 => 'Archivage'
            ];
            return $names[$stepIndex] ?? 'Étape inconnue';
        }
        return 'Étape inconnue';
    }

    private function generateClientFichePdf(Dossier $dossier)
    {
        $clientInfo = $dossier->clientInfo;

        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Fiche Client - ' . htmlspecialchars($dossier->reference) . '</title>
    <style>
        body {
            font-family: "DejaVu Sans", Arial, sans-serif;
            font-size: 12px;
            color: #333;
            line-height: 1.4;
            margin: 20px;
        }
        h1 {
            color: #1976d2;
            border-bottom: 3px solid #1976d2;
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-size: 18px;
            text-align: center;
        }
        h2 {
            color: #424242;
            margin-top: 25px;
            margin-bottom: 15px;
            font-size: 14px;
            border-left: 4px solid #1976d2;
            padding-left: 10px;
            background: #f5f5f5;
            padding: 8px 12px;
        }
        .section {
            margin: 20px 0;
            background: #fafafa;
            border: 1px solid #e0e0e0;
            border-radius: 5px;
            padding: 15px;
        }
        .field {
            margin: 8px 0;
            display: table;
            width: 100%;
        }
        .label {
            display: table-cell;
            font-weight: bold;
            color: #555;
            width: 200px;
            vertical-align: top;
        }
        .value {
            display: table-cell;
            color: #333;
            background: white;
            border: 1px solid #ddd;
            padding: 5px 8px;
            border-radius: 3px;
        }
        .dossier-info {
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        }
        .client-info {
            background: linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%);
        }
        .sinistre-info {
            background: linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%);
        }
        @media print {
            body { margin: 10mm; }
            .field { break-inside: avoid; }
        }
        .workflow-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .workflow-table th, .workflow-table td {
            border: 1px solid #ddd;
            padding: 6px 8px;
            text-align: left;
        }
        .workflow-table th {
            background: #f5f5f5;
            font-weight: bold;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #1976d2;
            font-size: 10px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <h1>Fiche Client - Dossier ' . htmlspecialchars($dossier->reference) . '</h1>

    <div class="section dossier-info">
        <h2>Informations du Dossier</h2>
        <div class="field">
            <span class="label">Titre:</span>
            <span class="value">' . htmlspecialchars($dossier->title) . '</span>
        </div>
        <div class="field">
            <span class="label">Référence:</span>
            <span class="value">' . htmlspecialchars($dossier->reference) . '</span>
        </div>
        <div class="field">
            <span class="label">Statut:</span>
            <span class="value">' . htmlspecialchars($dossier->status) . '</span>
        </div>
        <div class="field">
            <span class="label">Service:</span>
            <span class="value">' . htmlspecialchars($dossier->world?->name ?? 'Non spécifié') . '</span>
        </div>
        <div class="field">
            <span class="label">Date de création:</span>
            <span class="value">' . htmlspecialchars($dossier->created_at->format('d/m/Y H:i')) . '</span>
        </div>
        <div class="field">
            <span class="label">Créé par:</span>
            <span class="value">' . htmlspecialchars($dossier->owner?->name ?? 'Inconnu') . '</span>
        </div>
    </div>';

        if ($clientInfo) {
            $html .= '
    <div class="section client-info">
        <h2>Informations du Client</h2>
        <div class="field">
            <span class="label">Type de client:</span>
            <span class="value">' . htmlspecialchars($clientInfo->client_type ?? 'Non spécifié') . '</span>
        </div>
        <div class="field">
            <span class="label">Nom:</span>
            <span class="value">' . htmlspecialchars($clientInfo->nom ?? '') . '</span>
        </div>
        <div class="field">
            <span class="label">Prénom:</span>
            <span class="value">' . htmlspecialchars($clientInfo->prenom ?? '') . '</span>
        </div>
        <div class="field">
            <span class="label">Téléphone:</span>
            <span class="value">' . htmlspecialchars($clientInfo->telephone ?? '') . '</span>
        </div>
        <div class="field">
            <span class="label">Email:</span>
            <span class="value">' . htmlspecialchars($clientInfo->email ?? '') . '</span>
        </div>
        <div class="field">
            <span class="label">Adresse client:</span>
            <span class="value">' . htmlspecialchars($clientInfo->adresse_client ?? '') . '</span>
        </div>';

            // Add owner information for tenants
            if ($clientInfo->client_type === 'locataire') {
                if ($clientInfo->nom_proprietaire || $clientInfo->prenom_proprietaire) {
                    $html .= '<div class="field">
                        <span class="label">Propriétaire - Nom:</span>
                        <span class="value">' . htmlspecialchars($clientInfo->nom_proprietaire ?? '') . ' ' . htmlspecialchars($clientInfo->prenom_proprietaire ?? '') . '</span>
                    </div>';
                }
                if ($clientInfo->telephone_proprietaire) {
                    $html .= '<div class="field">
                        <span class="label">Propriétaire - Téléphone:</span>
                        <span class="value">' . htmlspecialchars($clientInfo->telephone_proprietaire) . '</span>
                    </div>';
                }
                if ($clientInfo->email_proprietaire) {
                    $html .= '<div class="field">
                        <span class="label">Propriétaire - Email:</span>
                        <span class="value">' . htmlspecialchars($clientInfo->email_proprietaire) . '</span>
                    </div>';
                }
                if ($clientInfo->adresse_proprietaire) {
                    $html .= '<div class="field">
                        <span class="label">Propriétaire - Adresse:</span>
                        <span class="value">' . htmlspecialchars($clientInfo->adresse_proprietaire) . '</span>
                    </div>';
                }
            }

            if ($clientInfo->type_sinistre || $clientInfo->adresse_sinistre || $clientInfo->date_sinistre) {
                $html .= '
    </div>
    <div class="section sinistre-info">
        <h2>Informations du Sinistre</h2>
        <div class="field">
            <span class="label">Type de sinistre:</span>
            <span class="value">' . htmlspecialchars($clientInfo->type_sinistre ?? '') . '</span>
        </div>
        <div class="field">
            <span class="label">Adresse du sinistre:</span>
            <span class="value">' . htmlspecialchars($clientInfo->adresse_sinistre ?? '') . '</span>
        </div>
        <div class="field">
            <span class="label">Date du sinistre:</span>
            <span class="value">' . htmlspecialchars($clientInfo->date_sinistre ? \Carbon\Carbon::parse($clientInfo->date_sinistre)->format('d/m/Y') : '') . '</span>
        </div>
        <div class="field">
            <span class="label">Compagnie d\'assurance:</span>
            <span class="value">' . htmlspecialchars($clientInfo->compagnie_assurance ?? '') . '</span>
        </div>
        <div class="field">
            <span class="label">Numéro de police:</span>
            <span class="value">' . htmlspecialchars($clientInfo->numero_police ?? '') . '</span>
        </div>';
            }

            $html .= '</div>';
        } else {
            $html .= '
    <div class="section">
        <p><em>Aucune information client disponible</em></p>
    </div>';
        }

        // Add workflow summary
        $workflowSteps = $dossier->workflowProgress()->with('workflowStep')->get();
        if ($workflowSteps->count() > 0) {
            $html .= '
    <div class="section">
        <h2>Résumé du Workflow</h2>
        <table class="workflow-table">
            <thead>
                <tr>
                    <th>Étape</th>
                    <th>Statut</th>
                    <th>Démarré</th>
                    <th>Terminé</th>
                </tr>
            </thead>
            <tbody>';

            foreach ($workflowSteps as $step) {
                $html .= '<tr>
                    <td>' . htmlspecialchars($step->workflowStep?->name ?? 'Étape inconnue') . '</td>
                    <td>' . htmlspecialchars(ucfirst($step->status)) . '</td>
                    <td>' . htmlspecialchars($step->started_at ? $step->started_at->format('d/m/Y H:i') : 'N/A') . '</td>
                    <td>' . htmlspecialchars($step->completed_at ? $step->completed_at->format('d/m/Y H:i') : 'En cours') . '</td>
                </tr>';
            }

            $html .= '</tbody>
        </table>
    </div>';
        }

        $html .= '
    <div class="footer">
        <p>Document généré automatiquement par JDE-Final le ' . date('d/m/Y à H:i') . '</p>
        <p>Référence dossier: ' . htmlspecialchars($dossier->reference) . '</p>
        <p><strong>Fiche Client - ' . htmlspecialchars($dossier->world?->name ?? 'Service') . '</strong></p>
    </div>
</body>
</html>';

        // Generate PDF using DomPDF
        $pdf = Pdf::loadHTML($html);
        $pdf->setPaper('a4', 'portrait');
        $pdf->setOptions([
            'defaultFont' => 'DejaVu Sans',
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => false,
        ]);

        return $pdf->output();
    }
}
