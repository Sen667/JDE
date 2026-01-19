<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create temporary table with auto-increment IDs
        Schema::create('profiles_temp', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->string('email')->unique();
            $table->string('display_name')->nullable();
            $table->string('avatar_url')->nullable();
            $table->timestamps();
        });

        // Copy existing data to temporary table
        DB::statement('INSERT INTO profiles_temp (id, user_id, email, display_name, avatar_url, created_at, updated_at)
                      SELECT ROW_NUMBER() OVER (ORDER BY id), user_id, email, display_name, avatar_url, created_at, updated_at
                      FROM profiles');

        // Drop old table
        Schema::drop('profiles');

        // Rename temp table to profiles
        Schema::rename('profiles_temp', 'profiles');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore UUID structure if needed
        Schema::create('profiles_uuid', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->string('email')->unique();
            $table->string('display_name')->nullable();
            $table->string('avatar_url')->nullable();
            $table->timestamps();
        });

        // Copy data back with UUID generation
        DB::statement('INSERT INTO profiles_uuid (id, user_id, email, display_name, avatar_url, created_at, updated_at)
                      SELECT UUID(), user_id, email, display_name, avatar_url, created_at, updated_at
                      FROM profiles');

        Schema::drop('profiles');
        Schema::rename('profiles_uuid', 'profiles');
    }
};
