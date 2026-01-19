<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowTemplate extends Model
{
    use HasFactory;

    protected $keyType = 'int';
    public $incrementing = true;

    protected $fillable = [
        'world_id',
        'name',
        'description',
        'version',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];


    public function world(): BelongsTo
    {
        return $this->belongsTo(World::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(WorkflowStep::class)->orderBy('step_number');
    }

    public function dossiers(): HasMany
    {
        return $this->hasManyThrough(Dossier::class, WorkflowStep::class, 'workflow_template_id', 'world_id');
    }

    public function getFirstStep()
    {
        return $this->steps()->where('step_number', 1)->first();
    }

    public function getNextStep(WorkflowStep $currentStep, bool $decision = null)
    {
        if ($decision !== null && $currentStep->requires_decision) {
            return $decision
                ? $currentStep->decisionYesNextStep
                : $currentStep->decisionNoNextStep;
        }

        return $currentStep->nextStep;
    }
}
