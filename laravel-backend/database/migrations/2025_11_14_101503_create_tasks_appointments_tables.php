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
        // Tasks table
        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['todo', 'in_progress', 'done', 'cancelled'])->default('todo');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->timestamp('due_date')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('world_id')->constrained('worlds');
            $table->foreignId('workflow_step_id')->nullable()->constrained('workflow_steps'); // Match workflow_steps integer ID
            $table->timestamps();
        });

        // Appointments table
        Schema::create('appointments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamp('start_time');
            $table->timestamp('end_time');
            $table->enum('status', ['scheduled', 'completed', 'cancelled'])->default('scheduled');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('world_id')->nullable()->constrained('worlds');
            $table->foreignUuid('dossier_id')->nullable()->constrained('dossiers')->onDelete('cascade');
            $table->foreignId('workflow_step_id')->nullable()->constrained('workflow_steps'); // Match workflow_steps integer ID
            $table->string('appointment_type')->nullable();
            $table->timestamps();
        });

        // Notifications table
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->string('title');
            $table->text('message');
            $table->enum('type', ['task', 'appointment', 'system', 'dossier']);
            $table->boolean('read')->default(false);
            $table->uuid('related_id')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('tasks');
    }
};
