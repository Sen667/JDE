<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DossierClientInfo extends Model
{
    use HasFactory;

    protected $table = 'dossier_client_info';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'dossier_id',
        'world_id',
        'primary_world_id',
        'client_type',
        'nom',
        'prenom',
        'telephone',
        'email',
        // New shared fields
        'nom_societe',
        'adresse_facturation',
        'adresse_client',
        'travaux_suite_sinistre',
        'type_proprietaire',
        'origine_dossier',
        'numero_dossier_jde',
        'references_devis_travaux',
        'nature_travaux',
        'numero_permis_construire',
        'numero_declaration_prealable',
        // DBCS specific fields
        'adresse_realisation_travaux',
        'branchement_provisoire',
        'occupation_voirie',
        // JDMO specific fields
        'adresse_realisation_missions',
        'modification_plan',
        // Additional propriétaire fields
        'nom_proprietaire',
        'prenom_proprietaire',
        'telephone_proprietaire',
        'email_proprietaire',
        'adresse_proprietaire',
        // Existing fields
        'adresse_sinistre',
        'type_sinistre',
        'date_sinistre',
        'compagnie_assurance',
        'numero_police',
        'montant_dommage_batiment',
        'metadata',
        'date_reception',
        'origine'
    ];

    protected $casts = [
        'date_sinistre' => 'date',
        'montant_dommage_batiment' => 'decimal:2',
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

    public function dossier(): BelongsTo
    {
        return $this->belongsTo(Dossier::class);
    }

    public function world(): BelongsTo
    {
        return $this->belongsTo(\App\Models\World::class);
    }

    public function getDossiersCountAttribute()
    {
        if ($this->dossier_id) {
            return 1;
        }

        // For standalone clients (dossier_id is null), they are reusable
        // but not currently linked to multiple dossiers in this architecture
        // Future enhancement: Add client_dossier junction table for many-to-many
        return 0;
    }
}
