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
        // Dossier transfers table
        Schema::create('dossier_transfers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('source_dossier_id')->constrained('dossiers')->onDelete('cascade');
            $table->unsignedBigInteger('source_world_id');
            $table->foreign('source_world_id')->references('id')->on('worlds');
            $table->unsignedBigInteger('target_world_id');
            $table->foreign('target_world_id')->references('id')->on('worlds');
            $table->foreignUuid('target_dossier_id')->nullable()->constrained('dossiers')->onDelete('set null');
            $table->string('transfer_type');
            $table->enum('transfer_status', ['pending', 'in_progress', 'completed', 'failed'])->default('pending');
            $table->unsignedBigInteger('transferred_by');
            $table->foreign('transferred_by')->references('id')->on('users')->onDelete('cascade');
            $table->timestamp('transferred_at');
            $table->timestamp('completed_at')->nullable();
            $table->json('metadata');
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dossier_transfers');
    }
};
