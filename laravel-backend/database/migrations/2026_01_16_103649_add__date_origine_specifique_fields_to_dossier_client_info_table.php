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
        Schema::table('dossier_client_info', function (Blueprint $table) {
            $table->enum('origine', ['Email', 'Téléphone', 'Courrier', 'Plateforme'])->nullable()->after('numero_permis_construire');
            $table->date('date_reception')->nullable()->after('origine');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dossier_client_info', function (Blueprint $table) {
              $table->dropColumn([
             'origine',
             'date_reception'
            ]);
        });
    }
};
