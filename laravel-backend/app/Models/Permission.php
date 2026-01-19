<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'label',
        'description',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'permission_user', 'permission_id', 'user_id')
            ->withPivot('environment')
            ->withTimestamps();
    }

    public function worlds(): BelongsToMany
    {
        return $this->belongsToMany(World::class, 'world_permissions', 'permission_id', 'world_id');
    }

    public function userWorldPermissions()
    {
        return $this->hasMany(UserWorldPermission::class);
    }
}
