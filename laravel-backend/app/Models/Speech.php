<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Speech extends Model
{
    use HasFactory;

    protected $fillable = [
        'vocal_audio',
        'titre_vocal',
        'text_retranscrit',
        'date_vocal',
        'dossier_id',
        'user_id'
    ];

    protected $casts = [
        'date_vocal' => 'datetime',
    ];
}
