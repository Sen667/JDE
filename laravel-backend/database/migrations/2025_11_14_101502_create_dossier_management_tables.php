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
        // Dossier client info table
        Schema::create('dossier_client_info', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('dossier_id')->constrained('dossiers')->onDelete('cascade')->unique();
            $table->enum('client_type', ['locataire', 'proprietaire', 'proprietaire_non_occupant', 'professionnel']);
            $table->string('nom')->nullable();
            $table->string('prenom')->nullable();
            $table->string('telephone')->nullable();
            $table->string('email')->nullable();
            $table->text('adresse_sinistre')->nullable();
            $table->string('type_sinistre')->nullable();
            $table->date('date_sinistre')->nullable();
            $table->string('compagnie_assurance')->nullable();
            $table->string('numero_police')->nullable();
            $table->json('metadata');
            $table->timestamps();
        });

        // Dossier attachments table
        Schema::create('dossier_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('dossier_id')->constrained('dossiers')->onDelete('cascade');
            $table->foreignId('workflow_step_id')->nullable()->constrained('workflow_steps'); // Match workflow_steps integer ID
            $table->string('file_name');
            $table->string('file_type');
            $table->bigInteger('file_size');
            $table->string('storage_path');
            $table->string('document_type')->nullable();
            $table->foreignId('uploaded_by')->constrained('users')->onDelete('cascade'); // Consistent integer foreign key
            $table->boolean('is_generated')->default(false);
            $table->json('metadata');
            $table->timestamps();
        });

        // Dossier comments table
        Schema::create('dossier_comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('dossier_id')->constrained('dossiers')->onDelete('cascade');
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->enum('comment_type', ['comment', 'status_change', 'step_completed', 'document_added', 'decision_made'])->default('comment');
            $table->text('content');
            $table->json('metadata');
            $table->timestamps();
        });

        // Dossier step annotations table
        Schema::create('dossier_step_annotations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('dossier_id')->constrained('dossiers')->onDelete('cascade');
            $table->foreignId('workflow_step_id')->nullable()->constrained('workflow_steps')->onDelete('set null'); // Match workflow_steps integer ID
            $table->enum('annotation_type', ['note', 'document_status', 'conversation', 'custom']);
            $table->string('title');
            $table->text('content');
            $table->json('metadata');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade'); // Consistent integer foreign key
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dossier_step_annotations');
        Schema::dropIfExists('dossier_comments');
        Schema::dropIfExists('dossier_attachments');
        Schema::dropIfExists('dossier_client_info');
    }
};
