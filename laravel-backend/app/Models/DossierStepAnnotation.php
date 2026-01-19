<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DossierStepAnnotation extends Model
{
    use HasFactory;

    protected $fillable = [
        'dossier_id',
        'workflow_step_id',
        'user_id',
        'content',
        'annotation_type', // 'note', 'warning', 'info', 'error'
        'position_x',
        'position_y',
        'metadata',
    ];

    protected $casts = [
        'position_x' => 'integer',
        'position_y' => 'integer',
        'metadata' => 'array',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('annotation_type', $type);
    }
}
