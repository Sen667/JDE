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
            $table->text('rollback_reason')->nullable()->after('decision_reason');
            $table->timestamp('rolled_back_at')->nullable()->after('rollback_reason');
            $table->unsignedBigInteger('rolled_back_by')->nullable()->after('rolled_back_at');
            $table->integer('rollback_count')->default(0)->after('rolled_back_by');

            $table->foreign('rolled_back_by')->references('id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dossier_workflow_progress', function (Blueprint $table) {
            $table->dropForeign(['rolled_back_by']);
            $table->dropColumn(['rollback_reason', 'rolled_back_at', 'rolled_back_by', 'rollback_count']);
        });
    }
};
