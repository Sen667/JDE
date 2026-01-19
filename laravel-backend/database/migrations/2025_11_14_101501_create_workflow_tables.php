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
        // Workflow templates table - CONVERTED TO INTEGER IDs
        Schema::create('workflow_templates', function (Blueprint $table) {
            $table->id(); // Auto-increment integer primary key
            $table->foreignId('world_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('version')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Workflow steps table - CONVERTED TO INTEGER IDs
        Schema::create('workflow_steps', function (Blueprint $table) {
            $table->id(); // Auto-increment integer primary key
            $table->foreignId('workflow_template_id')->constrained('workflow_templates')->onDelete('cascade');
            $table->integer('step_number');
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('step_type', ['action', 'decision', 'document', 'meeting', 'notification', 'milestone']);
            $table->boolean('requires_decision')->default(false);
            $table->foreignId('decision_yes_next_step_id')->nullable()->constrained('workflow_steps');
            $table->foreignId('decision_no_next_step_id')->nullable()->constrained('workflow_steps');
            $table->foreignId('next_step_id')->nullable()->constrained('workflow_steps');
            $table->json('parallel_steps');
            $table->boolean('can_loop_back')->default(false);
            $table->boolean('is_optional')->default(false);
            $table->json('auto_actions');
            $table->json('conditions');
            $table->json('form_fields');
            $table->json('metadata');
            $table->timestamps();
        });

        // Document templates table - CONVERTED TO INTEGER IDs
        Schema::create('document_templates', function (Blueprint $table) {
            $table->id(); // Auto-increment integer primary key
            $table->foreignId('workflow_step_id')->constrained('workflow_steps')->onDelete('cascade');
            $table->string('name');
            $table->string('document_type');
            $table->json('template_content');
            $table->json('required_fields');
            $table->boolean('auto_generate')->default(false);
            $table->boolean('needs_signature')->default(false);
            $table->json('metadata');
            $table->timestamps();
        });

        // Dossier workflow progress table - CONVERTED TO INTEGER IDs
        Schema::create('dossier_workflow_progress', function (Blueprint $table) {
            $table->id(); // Auto-increment integer primary key
            $table->uuid('dossier_id'); // Match dossiers UUID
            $table->foreign('dossier_id')->references('id')->on('dossiers')->onDelete('cascade');
            $table->foreignId('workflow_step_id')->constrained('workflow_steps')->onDelete('cascade');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'skipped', 'blocked'])->default('pending');
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('completed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->boolean('decision_taken')->nullable();
            $table->json('form_data');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('due_date')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->boolean('blocked')->default(false);
            $table->text('blocking_reason')->nullable();
            $table->unique(['dossier_id', 'workflow_step_id']);
            $table->timestamps();
        });

        // Dossier workflow history table - CONVERTED TO INTEGER IDs
        Schema::create('dossier_workflow_history', function (Blueprint $table) {
            $table->id(); // Auto-increment integer primary key
            $table->uuid('dossier_id'); // Match dossiers UUID
            $table->foreign('dossier_id')->references('id')->on('dossiers')->onDelete('cascade');
            $table->foreignId('workflow_step_id')->constrained('workflow_steps');
            $table->foreignId('previous_step_id')->nullable()->constrained('workflow_steps');
            $table->foreignId('next_step_id')->nullable()->constrained('workflow_steps');
            $table->string('decision_taken')->nullable();
            $table->text('decision_reason')->nullable();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->json('metadata');
            $table->timestamp('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dossier_workflow_history');
        Schema::dropIfExists('dossier_workflow_progress');
        Schema::dropIfExists('document_templates');
        Schema::dropIfExists('workflow_steps');
        Schema::dropIfExists('workflow_templates');
    }
};
