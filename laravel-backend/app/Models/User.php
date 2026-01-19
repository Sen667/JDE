<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'email_verified_at',
        'phone',
        'profile_photo_path',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // Profile relationship
    public function profile()
    {
        return $this->hasOne(Profile::class);
    }

    // World access
    public function worldAccess()
    {
        return $this->belongsToMany(World::class, 'user_world_access', 'user_id', 'world_id');
    }

    // Alias for accessible worlds
    public function accessibleWorlds()
    {
        return $this->worldAccess();
    }

    // Dossiers
    public function createdDossiers()
    {
        return $this->hasMany(Dossier::class, 'owner_id');
    }

    // Tasks
    public function assignedTasks()
    {
        return $this->hasMany(Task::class, 'assigned_to');
    }

    public function createdTasks()
    {
        return $this->hasMany(Task::class, 'created_by');
    }

    // Appointments
    public function createdAppointments()
    {
        return $this->hasMany(Appointment::class, 'created_by');
    }

    public function appointments()
    {
        return $this->belongsToMany(Appointment::class, 'appointment_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    // Notifications
    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    // Comments
    public function comments()
    {
        return $this->hasMany(DossierComment::class);
    }

    // Attachments uploaded
    public function uploadedAttachments()
    {
        return $this->hasMany(DossierAttachment::class, 'uploaded_by');
    }

    // Workflow progress completed
    public function completedWorkflowSteps()
    {
        return $this->hasMany(DossierWorkflowProgress::class, 'completed_by');
    }

    // Transfers made
    public function dossierTransfers()
    {
        return $this->hasMany(DossierTransfer::class, 'transferred_by');
    }

    // Helper methods
    public function hasWorldAccess(string $worldCode): bool
    {
        if ($this->hasRole('super-admin') || $this->hasRole('superadmin')) {
            return true;
        }

        return $this->worldAccess()->where('code', $worldCode)->exists();
    }

    public function canAccessDossier(Dossier $dossier): bool
    {
        if ($this->hasRole('superadmin')) {
            return true;
        }

        return $this->hasWorldAccess($dossier->world->code);
    }
}
