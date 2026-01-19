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
        Schema::create('dossier_workflow_histories', function (Blueprint $table) {
            $table->id();
            $table->uuid('dossier_id');
            $table->unsignedBigInteger('workflow_step_id')->nullable();
            $table->string('action'); // 'rollback', 'complete', 'start', etc.
            $table->string('old_status')->nullable();
            $table->string('new_status')->nullable();
            $table->unsignedBigInteger('performed_by');
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('dossier_id')->references('id')->on('dossiers')->onDelete('cascade');
            $table->foreign('workflow_step_id')->references('id')->on('workflow_steps')->onDelete('set null');
            $table->foreign('performed_by')->references('id')->on('users')->onDelete('cascade');

            $table->index(['dossier_id', 'created_at']);
            $table->index(['workflow_step_id']);
            $table->index(['performed_by']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dossier_workflow_histories');
    }
};
