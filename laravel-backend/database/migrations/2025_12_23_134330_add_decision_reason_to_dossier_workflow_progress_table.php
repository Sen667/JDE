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
        Schema::table('dossier_workflow_progress', function (Blueprint $table) {
            $table->text('decision_reason')->nullable()->after('decision_taken');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dossier_workflow_progress', function (Blueprint $table) {
            $table->dropColumn('decision_reason');
        });
    }
};
