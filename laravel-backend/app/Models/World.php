<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class World extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'theme_colors',
    ];

    protected $casts = [
        'theme_colors' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_world_access', 'world_id', 'user_id');
    }

    public function accessibleUsers(): BelongsToMany
    {
        return $this->users();
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'world_permissions', 'world_id', 'permission_id');
    }

    public function dossiers(): HasMany
    {
        return $this->hasMany(Dossier::class);
    }

    public function workflowTemplates(): HasMany
    {
        return $this->hasMany(WorkflowTemplate::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function incomingTransfers(): HasMany
    {
        return $this->hasMany(DossierTransfer::class, 'target_world_id');
    }

    public function outgoingTransfers(): HasMany
    {
        return $this->hasMany(DossierTransfer::class, 'source_world_id');
    }
}
