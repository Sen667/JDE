<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DossierAdministrativeDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'dossier_id',
        'document_type',
        'status',
        'document_label',
        'attachment_id',
        'uploaded_by',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    const STATUS_PENDING = 'pending';
    const STATUS_RECEIVED = 'received';
    const STATUS_UPLOADED = 'uploaded';

    const DOCUMENT_TYPES = [

        'locataire' => ['CERFA', 'BAIL', 'QUITTANCE_LOYER', 'BANQUE', 'POUVOIR', 'AUTRE'],
        'proprietaire' => ['CERFA', 'ATTEST_PROPRI', 'BANQUE', 'POUVOIR', 'AUTRE'],
        'proprietaire_non_occupant' => ['CERFA', 'ATTEST_PROPRI', 'BANQUE', 'POUVOIR', 'AUTRE'],
        'professionnel' => ['CERFA', 'STATUTS', 'CP_CG', 'KBIS', 'BILANS', 'BANQUE', 'POUVOIR', 'AUTRE'],
    ];

    const DOCUMENT_LABELS = [
        'CERFA' => 'CERFA',
        'BAIL' => 'Bail',
        'QUITTANCE_LOYER' => 'Quittance loyer',
        'ATTEST_PROPRI' => 'Attestation propriétaire',
        'STATUTS' => 'Statuts',
        'CP_CG' => 'CP/CG',
        'KBIS' => 'KBIS',
        'BILANS' => 'Bilans',
        'BANQUE' => 'Documents bancaires',
        'POUVOIR' => 'Pouvoir',
        'AUTRE' => 'Autre',
    ];


    public function dossier(): BelongsTo
    {
        return $this->belongsTo(Dossier::class);
    }


    public function attachment(): BelongsTo
    {
        return $this->belongsTo(DossierAttachment::class, 'attachment_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getDocumentLabelAttribute($value): string
    {
        return $value ?? self::DOCUMENT_LABELS[$this->document_type] ?? $this->document_type;
    }


    public static function getDocumentTypesForClient(string $clientType): array
    {
        return self::DOCUMENT_TYPES[$clientType] ?? self::DOCUMENT_TYPES['locataire'];
    }


    public static function getDocumentLabel(string $documentType): string
    {
        return self::DOCUMENT_LABELS[$documentType] ?? $documentType;
    }
}
