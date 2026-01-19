<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DossierWorkflowProgress extends Model
{
    use HasFactory;

    protected $keyType = 'int';           // ✅ Use integer keys
    public $incrementing = true;          // ✅ Auto-increment enabled

    protected $fillable = [
        'dossier_id',
        'workflow_step_id',
        'status',
        'assigned_to',
        'priority',
        'due_date',
        'completed_at',
        'notes',
        'form_data',
        'decision_taken',
        'decision_reason',
        'rollback_reason',
        'rolled_back_at',
        'rolled_back_by',
        'rollback_count',
    ];

    protected $casts = [
        'due_date' => 'datetime',
        'completed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];


    public function dossier(): BelongsTo
    {
        return $this->belongsTo(Dossier::class);
    }

    public function workflowStep(): BelongsTo
    {
        return $this->belongsTo(WorkflowStep::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function markAsCompleted()
    {
        $this->status = 'completed';
        $this->completed_at = now();
        $this->save();
    }

    public function isCompleted()
    {
        return $this->status === 'completed';
    }

    public function isOverdue()
    {
        return $this->due_date && $this->due_date->isPast() && !$this->isCompleted();
    }

    /**
     * Check if this step can be rolled back
     */
    public function canBeRolledBack()
    {
        // Cannot rollback if already rolled back
        if ($this->rolled_back_at) {
            return false;
        }

        // Cannot rollback if not completed
        if (!$this->isCompleted()) {
            return false;
        }

        // Cannot rollback final steps (step numbers that indicate completion)
        $finalSteps = [27, 14, 30]; // JDE final, JDMO final, DBCS final
        if (in_array($this->workflowStep->step_number, $finalSteps)) {
            return false;
        }

        return true;
    }

    /**
     * Rollback this workflow step
     */
    public function rollback($reason, $userId)
    {
        if (!$this->canBeRolledBack()) {
            throw new \Exception('This step cannot be rolled back');
        }

        $this->update([
            'status' => 'pending',
            'completed_at' => null,
            'decision_taken' => null,
            'decision_reason' => null,
            'rollback_reason' => $reason,
            'rolled_back_at' => now(),
            'rolled_back_by' => $userId,
            'rollback_count' => ($this->rollback_count ?? 0) + 1,
        ]);

        // Log the rollback action
        \Log::info('Workflow step rolled back', [
            'progress_id' => $this->id,
            'step_id' => $this->workflow_step_id,
            'step_name' => $this->workflowStep->name,
            'dossier_id' => $this->dossier_id,
            'reason' => $reason,
            'user_id' => $userId,
        ]);

        return $this;
    }

    /**
     * Get rollback history for this step
     */
    public function getRollbackHistory()
    {
        return [
            'has_been_rolled_back' => !is_null($this->rolled_back_at),
            'rollback_count' => $this->rollback_count ?? 0,
            'last_rollback' => $this->rolled_back_at ? [
                'reason' => $this->rollback_reason,
                'rolled_back_at' => $this->rolled_back_at,
                'rolled_back_by' => $this->rolled_back_by,
            ] : null,
        ];
    }
}
