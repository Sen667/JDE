<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'workflow_template_id',
        'step_number',
        'name',
        'description',
        'step_type',
        'requires_decision',
        'decision_yes_next_step_id',
        'decision_no_next_step_id',
        'is_optional',
        'can_loop_back',
        'next_step_id',
        'parallel_steps',
        'auto_actions',
        'conditions',
        'form_fields',
        'metadata',
    ];

    protected $casts = [
        'requires_decision' => 'boolean',
        'is_optional' => 'boolean',
        'can_loop_back' => 'boolean',
        'form_fields' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function workflowTemplate(): BelongsTo
    {
        return $this->belongsTo(WorkflowTemplate::class);
    }

    public function workflowProgress(): HasMany
    {
        return $this->hasMany(DossierWorkflowProgress::class, 'workflow_step_id');
    }

    // Helper methods
    public function getNextStep()
    {
        return $this->next_step_id ? WorkflowStep::find($this->next_step_id) : null;
    }

    public function getYesDecision()
    {
        return $this->decision_yes_next_step_id ? WorkflowStep::find($this->decision_yes_next_step_id) : null;
    }

    public function getNoDecision()
    {
        return $this->decision_no_next_step_id ? WorkflowStep::find($this->decision_no_next_step_id) : null;
    }

    public function isDecisionStep()
    {
        return $this->requires_decision;
    }
}
