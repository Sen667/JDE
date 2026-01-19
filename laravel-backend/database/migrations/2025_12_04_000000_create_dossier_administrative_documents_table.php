<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('dossier_administrative_documents', function (Blueprint $table) {
            $table->id();
            $table->string('dossier_id'); // Match dossiers table UUID format
            $table->foreign('dossier_id')->references('id')->on('dossiers')->onDelete('cascade');
            $table->string('document_type'); // CERFA, BAIL, QUITTANCE_LOYER, etc.
            $table->enum('status', ['pending', 'received', 'uploaded'])->default('pending');
            $table->string('document_label'); // Human readable label
            $table->string('attachment_id')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->onDelete('set null');
            $table->json('metadata')->nullable(); // Additional data like expiry dates, etc.
            $table->timestamps();

            // One administrative document per type per dossier
            $table->unique(['dossier_id', 'document_type']);
            $table->index(['dossier_id', 'document_type']);
            $table->index(['status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dossier_administrative_documents');
    }
};
