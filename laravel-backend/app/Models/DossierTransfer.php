<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DossierTransfer extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    protected $fillable = [
        'source_dossier_id',
        'target_dossier_id',
        'source_world_id',
        'target_world_id',
        'transfer_status',
        'transfer_type',
        'transferred_by',
        'transferred_at',
        'completed_at',
        'metadata',
        'error_message'
    ];

    protected $casts = [
        'transferred_at' => 'datetime',
        'completed_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function sourceDossier(): BelongsTo
    {
        return $this->belongsTo(Dossier::class, 'source_dossier_id');
    }

    public function targetDossier(): BelongsTo
    {
        return $this->belongsTo(Dossier::class, 'target_dossier_id');
    }

    public function sourceWorld(): BelongsTo
    {
        return $this->belongsTo(World::class, 'source_world_id');
    }

    public function targetWorld(): BelongsTo
    {
        return $this->belongsTo(World::class, 'target_world_id');
    }

    public function transferredByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'transferred_by');
    }

    public function scopePending($query)
    {
        return $query->where('transfer_status', 'pending');
    }

    public function scopeCompleted($query)
    {
        return $query->where('transfer_status', 'completed');
    }

    public function completeTransfer()
    {
        $this->update([
            'transfer_status' => 'completed',
            'completed_at' => now(),
        ]);

        return $this;
    }

    public function failTransfer($reason = null)
    {
        $this->update([
            'transfer_status' => 'failed',
            'error_message' => $reason,
        ]);

        return $this;
    }
}
