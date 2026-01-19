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
        // NOTE: Roles table is created by Spatie Laravel Permission package
        // Do not create roles table here - use Spatie's migration

        // Worlds table
        Schema::create('worlds', function (Blueprint $table) {
            $table->id();
            $table->enum('code', ['JDE', 'JDMO', 'DBCS'])->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('theme_colors');
            $table->timestamps();
        });

        // NOTE: Permissions table is created by Spatie Laravel Permission package
        // Do not create permissions table here - use Spatie's migration

        // Profile extension for users
        Schema::create('profiles', function (Blueprint $table) {
            $table->id(); // Auto-increment primary key
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->string('email')->unique();
            $table->string('display_name')->nullable();
            $table->string('avatar_url')->nullable();
            $table->timestamps();
        });

        // User roles junction table (NOTE: role_id references Spatie's roles table which uses auto-increment)
        Schema::create('user_roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unsignedBigInteger('role_id');
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
            $table->unique(['user_id', 'role_id']);
            $table->timestamps();
        });

        // User world access junction table
        Schema::create('user_world_access', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unsignedBigInteger('world_id');
            $table->foreign('world_id')->references('id')->on('worlds')->onDelete('cascade');
            $table->unique(['user_id', 'world_id']);
            $table->timestamps();
        });

        // World permissions junction table (NOTE: permission_id references Spatie's permissions table which uses auto-increment)
        Schema::create('world_permissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('world_id');
            $table->foreign('world_id')->references('id')->on('worlds')->onDelete('cascade');
            $table->unsignedBigInteger('permission_id');
            $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
            $table->unique(['world_id', 'permission_id']);
            $table->timestamps();
        });

        // User world permissions junction table (NOTE: permission_id references Spatie's permissions table which uses auto-increment)
        Schema::create('user_world_permissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unsignedBigInteger('world_id');
            $table->foreign('world_id')->references('id')->on('worlds')->onDelete('cascade');
            $table->unsignedBigInteger('permission_id');
            $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
            $table->unique(['user_id', 'world_id', 'permission_id']);
            $table->timestamps();
        });

        // Dossiers table
        Schema::create('dossiers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->unsignedBigInteger('world_id');
            $table->foreign('world_id')->references('id')->on('worlds')->onDelete('cascade');
            $table->unsignedBigInteger('owner_id');
            $table->foreign('owner_id')->references('id')->on('users')->onDelete('cascade');
            $table->enum('status', ['nouveau', 'en_cours', 'cloture'])->default('nouveau');
            $table->json('tags')->nullable();
            $table->string('reference')->unique();
            $table->timestamps();
        });

        // Audit logs table
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->string('action');
            $table->string('target');
            $table->enum('world_code', ['JDE', 'JDMO', 'DBCS'])->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('dossiers');
        Schema::dropIfExists('user_world_permissions');
        Schema::dropIfExists('world_permissions');
        Schema::dropIfExists('user_world_access');
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('profiles');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('worlds');
        Schema::dropIfExists('roles');
    }
};
