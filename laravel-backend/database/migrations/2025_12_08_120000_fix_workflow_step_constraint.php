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
        // First drop the foreign key constraint
        Schema::table('dossier_workflow_progress', function (Blueprint $table) {
            // Drop FK constraint (use database-specific constraint name)
            $table->dropForeign(['workflow_step_id']); // Laravel auto-detects the FK name
        });

        // Then change column type to allow both UUIDs and fallback step strings
        Schema::table('dossier_workflow_progress', function (Blueprint $table) {
            if (Schema::hasColumn('dossier_workflow_progress', 'workflow_step_id')) {
                $table->string('workflow_step_id', 191)->nullable()->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dossier_workflow_progress', function (Blueprint $table) {
            // Change back to UUID format
            $table->string('workflow_step_id', 36)->nullable()->change();

            // Note: Foreign key will be handled by the original migration that creates the table
            // We don't re-add it here to avoid conflicts
        });
    }
};
