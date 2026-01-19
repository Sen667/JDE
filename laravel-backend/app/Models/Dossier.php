<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Models\DossierTransfer;
use App\Models\World;

class Dossier extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'title',
        'world_id',
        'owner_id',
        'status',
        'tags',
        'reference',
    ];

    protected $casts = [
        'tags' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) \Illuminate\Support\Str::uuid();
            }

            if (empty($model->reference)) {
                $model->generateReferenceNumber();
            }
        });
    }


    public function generateReferenceNumber()
    {
        $year = now()->year;
        $prefix = 'DOS-' . $year . '-';

        // Find the highest existing reference for this year
        $lastReference = static::where('reference', 'like', $prefix . '%')
            ->orderByRaw('CAST(SUBSTRING_INDEX(reference, "-", -1) AS UNSIGNED) DESC')
            ->value('reference');

        if ($lastReference) {
            // Extract the number from the last reference and increment
            $lastNumber = (int) substr(strrchr($lastReference, '-'), 1);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        $this->reference = $prefix . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
    }

    public function world(): BelongsTo
    {
        return $this->belongsTo(World::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function clientInfo(): HasOne
    {
        return $this->hasOne(DossierClientInfo::class);
    }

    // Workflow
    public function workflowProgress(): HasMany
    {
        return $this->hasMany(DossierWorkflowProgress::class);
    }

    public function workflowHistory(): HasMany
    {
        return $this->hasMany(DossierWorkflowHistory::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(DossierComment::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(DossierAttachment::class);
    }

    public function administrativeDocuments(): HasMany
    {
        return $this->hasMany(DossierAdministrativeDocument::class);
    }


    public function stepAnnotations(): HasMany
    {
        return $this->hasMany(DossierStepAnnotation::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasManyThrough(Task::class, WorkflowStep::class, 'workflow_template_id', 'workflow_step_id')
            ->whereIn('workflow_steps.id', function($query) {
                $query->select('workflow_step_id')
                    ->from('dossier_workflow_progress')
                    ->where('dossier_id', $this->id);
            });
    }


    public function outgoingTransfers(): HasMany
    {
        return $this->hasMany(DossierTransfer::class, 'source_dossier_id');
    }

    public function incomingTransfers(): HasMany
    {
        return $this->hasMany(DossierTransfer::class, 'target_dossier_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function getCurrentWorkflowSteps()
    {
        return $this->workflowProgress()->where('status', 'in_progress')->get();
    }

    public function getCompletedWorkflowSteps()
    {
        return $this->workflowProgress()->where('status', 'completed')->orderBy('updated_at', 'desc')->get();
    }

    public function getAvailableWorkflowSteps()
    {
        $template = $this->world->workflowTemplates()
            ->where('is_active', true)
            ->with(['steps' => function ($query) {
                $query->orderBy('step_number');
            }])
            ->first();

        if (!$template) {
            return collect();
        }

        $availableSteps = collect();
        $existingProgress = $this->workflowProgress()->pluck('workflow_step_id', 'status')->toArray();

        foreach ($template->steps as $step) {
            // Check if step is already completed
            if (isset($existingProgress[$step->id]) && $existingProgress[$step->id] === 'completed') {
                continue;
            }

            // Check if step is optional and already skipped
            if ($step->is_optional && isset($existingProgress[$step->id]) && $existingProgress[$step->id] === 'skipped') {
                continue;
            }

            // Include all remaining steps - users can always modify/review even if data exists
            $availableSteps->push($step);
        }

        return $availableSteps;
    }

    public function canBeAccessedBy(User $user): bool
    {
        return $user->canAccessDossier($this);
    }

    public function getWorkflowData(): array
    {
        $template = $this->world->workflowTemplates()
            ->where('is_active', true)
            ->with(['steps' => function ($query) {
                $query->orderBy('step_number');
            }])
            ->first();

        return [
            'template' => $template ? [
                'id' => $template->id,
                'name' => $template->name,
                'description' => $template->description,
                'steps' => $template->steps->map(function ($step) {
                    return [
                        'id' => $step->id,
                        'name' => $step->name,
                        'description' => $step->description,
                        'step_number' => $step->step_number,
                        'step_type' => $step->step_type,
                        'requires_decision' => $step->requires_decision,
                        'decision_yes_next_step_id' => $step->decision_yes_next_step_id,
                        'decision_no_next_step_id' => $step->decision_no_next_step_id,
                        'next_step_id' => $step->next_step_id,
                    ];
                })
            ] : null,
            'progress' => $this->workflowProgress->map(function ($progress) {
                return [
                    'id' => $progress->id,
                    'status' => $progress->status,
                    'started_at' => $progress->started_at,
                    'completed_at' => $progress->completed_at,
                    'assigned_to' => $progress->assigned_to,
                    'workflow_step_id' => $progress->workflow_step_id,
                    'form_data' => $progress->form_data,
                ];
            })
        ];
    }

    public function getTransferEligibility(string $targetWorldCode): array
    {
        $sourceCode = $this->world->code;

        $eligible = [
            'eligible' => false,
            'reason' => '',
            'allowed_transfers' => []
        ];

        switch ($sourceCode) {
            case 'JDE':
                $eligible['allowed_transfers'] = ['JDMO', 'DBCS'];
                $eligible['eligible'] = in_array($targetWorldCode, ['JDMO', 'DBCS']);
                break;
            case 'JDMO':
                $eligible['allowed_transfers'] = ['DBCS'];
                $eligible['eligible'] = $targetWorldCode === 'DBCS';
                break;
            case 'DBCS':
                $eligible['eligible'] = false;
                $eligible['reason'] = 'Les dossiers DBCS ne peuvent pas être transférés';
                break;
        }

        if (!$eligible['eligible'] && !$eligible['reason']) {
            $eligible['reason'] = "Transfert de {$sourceCode} vers {$targetWorldCode} non autorisé";
        }

        return $eligible;
    }

    public function isEligibleForTransferTo(string $targetWorldCode): array
    {
        return $this->getTransferEligibility($targetWorldCode);
    }

    public function transferTo(string $targetWorldCode, User $user)
    {
        try {
            \Log::info('Starting dossier transfer', [
                'source_dossier_id' => $this->id,
                'target_world_code' => $targetWorldCode,
                'transferred_by' => $user->id,
                'source_world_id' => $this->world_id
            ]);

            // Check eligibility
            $eligibility = $this->isEligibleForTransferTo($targetWorldCode);
            if (!$eligibility['eligible']) {
                throw new \Exception($eligibility['reason'] ?? "Transfer not allowed");
            }

            return \DB::transaction(function () use ($targetWorldCode, $user) {
                // Get target world
                $targetWorld = \App\Models\World::where('code', $targetWorldCode)->first();

                if (!$targetWorld) {
                    throw new \Exception("Target world '{$targetWorldCode}' not found");
                }

                // Validate required data
                if (!$this->owner_id) {
                    throw new \Exception("Source dossier missing owner_id");
                }
                if (!$this->title) {
                    throw new \Exception("Source dossier missing title");
                }

                // Create transfer record
                $transfer = DossierTransfer::create([
                    'source_dossier_id' => $this->id,
                    'source_world_id' => $this->world_id,
                    'target_world_id' => $targetWorld->id,
                    'transfer_status' => 'in_progress',
                    'transfer_type' => 'manual',
                    'transferred_by' => $user->id,
                    'transfer_reason' => 'Manual transfer via UI',
                    'transferred_at' => now(),
                    'metadata' => [
                        'source_title' => $this->title,
                        'source_reference' => $this->reference,
                        'has_client_info' => $this->clientInfo ? true : false
                    ],
                    'error_message' => null,
                ]);

                try {
                    // Duplicate the dossier to the target world
                    $duplicatedDossier = Dossier::create([
                        'title' => $this->title,
                        'world_id' => $targetWorld->id,
                        'owner_id' => $this->owner_id,
                        'status' => 'nouveau', // Reset to new status
                        'tags' => $this->tags,
                    ]);

                    // Link the transfer to the target dossier
                    $transfer->target_dossier_id = $duplicatedDossier->id;
                    $transfer->save();

                    // Copy client information if it exists
                    if ($this->clientInfo) {
                        try {
                            DossierClientInfo::create([
                                'dossier_id' => $duplicatedDossier->id,
                                'world_id' => $duplicatedDossier->world_id,
                                'nom' => $this->clientInfo->nom,
                                'prenom' => $this->clientInfo->prenom ?? '',
                                'telephone' => $this->clientInfo->telephone ?? '',
                                'email' => $this->clientInfo->email ?? '',
                                'client_type' => $this->clientInfo->client_type ?? 'particulier',
                                'adresse_sinistre' => $this->clientInfo->adresse_sinistre ?? '',
                                'type_sinistre' => $this->clientInfo->type_sinistre ?? '',
                                'date_sinistre' => $this->clientInfo->date_sinistre,
                                'compagnie_assurance' => $this->clientInfo->compagnie_assurance ?? '',
                                'numero_police' => $this->clientInfo->numero_police ?? '',
                                'metadata' => '{}',
                            ]);
                        } catch (\Exception $e) {
                            \Log::warning('Failed to copy client info during transfer', [
                                'transfer_id' => $transfer->id,
                                'error' => $e->getMessage()
                            ]);
                            // Continue - client info copy failure shouldn't stop transfer
                        }
                    }

                    // Mark transfer as completed
                    $transfer->transfer_status = 'completed';
                    $transfer->save();

                    \Log::info('Dossier transfer completed successfully', [
                        'transfer_id' => $transfer->id,
                        'source_dossier_id' => $this->id,
                        'target_dossier_id' => $duplicatedDossier->id,
                        'target_world_code' => $targetWorldCode
                    ]);

                    return $transfer;

                } catch (\Exception $e) {
                    // Update transfer with error status
                    $transfer->transfer_status = 'failed';
                    $transfer->error_message = $e->getMessage();
                    $transfer->save();

                    \Log::error('Dossier transfer failed during creation', [
                        'transfer_id' => $transfer->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);

                    throw $e; // Re-throw to abort transaction
                }
            });

        } catch (\Exception $e) {
            \Log::error('Dossier transfer failed completely', [
                'source_dossier_id' => $this->id,
                'target_world_code' => $targetWorldCode,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            throw new \Exception("Transfer failed: " . $e->getMessage());
        }
    }
}
