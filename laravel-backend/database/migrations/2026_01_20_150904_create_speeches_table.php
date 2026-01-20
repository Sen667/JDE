<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('speeches', function (Blueprint $table) {
            $table->id();
            $table->string('vocal_audio');
            $table->string('titre_vocal');
            $table->text('text_retranscrit')->nullable();
            $table->dateTime('date_vocal');

            // Foreign keys
            // Providing older syntax support or explicit connection if needed, but standard should work
            $table->unsignedBigInteger('dossier_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('speeches');
    }
};
