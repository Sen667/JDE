<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up() {
        // Drop unique constraint to allow reusable clients (ignore if doesn't exist)
        try {
            DB::statement('ALTER TABLE dossier_client_info DROP INDEX dossier_client_info_dossier_id_unique');
        } catch (Exception $e) {
            // Constraint might not exist, continue
        }

        // Make dossier_id nullable for standalone clients
        DB::statement('ALTER TABLE dossier_client_info MODIFY COLUMN dossier_id CHAR(36) NULL');

        // Add world_id column for tracking creation world (ignore if exists)
        try {
            DB::statement('ALTER TABLE dossier_client_info ADD COLUMN world_id CHAR(36) NULL AFTER id');
        } catch (Exception $e) {
            // Column might already exist, continue
        }

        // Add foreign key constraint to worlds table (ignore if exists)
        try {
            DB::statement('ALTER TABLE dossier_client_info ADD CONSTRAINT fk_client_world_id FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE SET NULL');
        } catch (Exception $e) {
            // Constraint might already exist, continue
        }
    }

    public function down() {
        // Clean up constraints and column
        DB::statement('ALTER TABLE dossier_client_info DROP FOREIGN KEY IF EXISTS fk_client_world_id');
        DB::statement('ALTER TABLE dossier_client_info DROP COLUMN IF EXISTS world_id');

        // Restore original constraints
        DB::statement('ALTER TABLE dossier_client_info MODIFY COLUMN dossier_id CHAR(36) NOT NULL');
        DB::statement('ALTER TABLE dossier_client_info ADD CONSTRAINT dossier_client_info_dossier_id_unique UNIQUE (dossier_id)');
    }
};
