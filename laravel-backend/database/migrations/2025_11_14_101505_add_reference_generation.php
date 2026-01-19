<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // PostgreSQL-specific functions - skipping for MySQL
        // This migration contains PostgreSQL stored functions that won't work with MySQL
        // The reference generation will need to be implemented differently for MySQL
        // or handled in application code instead
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS trigger_set_dossier_reference ON dossiers;');
        DB::statement('DROP FUNCTION IF EXISTS set_dossier_reference();');
        DB::statement('DROP FUNCTION IF EXISTS generate_dossier_reference();');
    }
};
