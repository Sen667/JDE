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
            // Shared fields between DBCS and JDMO
            $table->string('nom_societe')->nullable()->after('email');
            $table->text('adresse_facturation')->nullable()->after('nom_societe');
            $table->enum('travaux_suite_sinistre', ['oui', 'non'])->nullable()->after('adresse_client');
            $table->enum('type_proprietaire', ['proprietaire', 'proprietaire_non_occupant', 'exploitant'])->nullable()->after('travaux_suite_sinistre');
            $table->enum('origine_dossier', ['jde', 'nle', 'autres'])->nullable()->after('type_proprietaire');
            $table->string('numero_dossier_jde', 50)->nullable()->after('origine_dossier');
            $table->text('references_devis_travaux')->nullable()->after('numero_dossier_jde');
            $table->enum('nature_travaux', ['renovation', 'reconstruction'])->nullable()->after('references_devis_travaux');
            $table->string('numero_permis_construire', 50)->nullable()->after('nature_travaux');
            $table->string('numero_declaration_prealable', 50)->nullable()->after('numero_permis_construire');

            // DBCS specific fields
            $table->text('adresse_realisation_travaux')->nullable()->after('numero_declaration_prealable');
            $table->enum('branchement_provisoire', ['oui', 'non'])->nullable()->after('adresse_realisation_travaux');
            $table->enum('occupation_voirie', ['oui', 'non'])->nullable()->after('branchement_provisoire');

            // JDMO specific fields
            $table->text('adresse_realisation_missions')->nullable()->after('occupation_voirie');
            $table->enum('modification_plan', ['oui', 'non'])->nullable()->after('adresse_realisation_missions');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dossier_client_info', function (Blueprint $table) {
            // Drop all added columns in reverse order
            $table->dropColumn([
                'nom_societe',
                'adresse_facturation',
                'travaux_suite_sinistre',
                'type_proprietaire',
                'origine_dossier',
                'numero_dossier_jde',
                'references_devis_travaux',
                'nature_travaux',
                'numero_permis_construire',
                'numero_declaration_prealable',
                'adresse_realisation_travaux',
                'branchement_provisoire',
                'occupation_voirie',
                'adresse_realisation_missions',
                'modification_plan'
            ]);
        });
    }
};
