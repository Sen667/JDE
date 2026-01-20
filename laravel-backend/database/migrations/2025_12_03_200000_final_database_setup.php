<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up()
    {
        Schema::table('dossier_client_info', function (Blueprint $table) {
            // Make dossier_id nullable for standalone clients
            $table->char('dossier_id', 36)->nullable()->change();

            // Add world_id column if it doesn't exist
            if (!Schema::hasColumn('dossier_client_info', 'world_id')) {
                $table->unsignedBigInteger('world_id')->nullable()->after('id');
                $table->foreign('world_id', 'fk_client_world_id')->references('id')->on('worlds')->nullOnDelete();
            }
        });
    }

    public function down()
    {
        Schema::table('dossier_client_info', function (Blueprint $table) {
            $table->dropForeign('fk_client_world_id');
            $table->dropColumn('world_id');

            // Revert dossier_id changes
            $table->char('dossier_id', 36)->nullable(false)->change();
            $table->unique('dossier_id', 'dossier_client_info_dossier_id_unique');
        });
    }
};
