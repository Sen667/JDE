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
            // Add client address field (general client info)
            $table->text('adresse_client')->nullable()->after('email');

            // Add building damage amount field (for insurance claims)
            $table->decimal('montant_dommage_batiment', 15, 2)->nullable()->after('numero_police');

            // Add owner information fields (specifically for locataire client type)
            $table->string('nom_proprietaire')->nullable()->after('montant_dommage_batiment');
            $table->string('prenom_proprietaire')->nullable()->after('nom_proprietaire');
            $table->string('telephone_proprietaire')->nullable()->after('prenom_proprietaire');
            $table->string('email_proprietaire')->nullable()->after('telephone_proprietaire');
            $table->text('adresse_proprietaire')->nullable()->after('email_proprietaire');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dossier_client_info', function (Blueprint $table) {
            $table->dropColumn([
                'adresse_client',
                'montant_dommage_batiment',
                'nom_proprietaire',
                'prenom_proprietaire',
                'telephone_proprietaire',
                'email_proprietaire',
                'adresse_proprietaire'
            ]);
        });
    }
};
