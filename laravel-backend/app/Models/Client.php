<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'client_type',
        'nom',
        'prenom',
        'telephone',
        'email',
        'adresse_sinistre',
        'type_sinistre',
        'date_sinistre',
        'compagnie_assurance',
        'numero_police',
        'metadata',
    ];

    protected $casts = [
        'date_sinistre' => 'date',
        'metadata' => 'array',
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
        });
    }


    public function dossiers()
    {
        return $this->hasMany(DossierClientInfo::class);
    }
}
