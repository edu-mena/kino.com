<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Normaliza `WeeklyHours` do mock (array embutido de 7 dias, cada um com
     * uma lista de intervalos) em 2 tabelas relacionais — permite múltiplos
     * intervalos por dia (ex: almoço+jantar) sem JSON aninhado.
     */
    public function up(): void
    {
        Schema::create('restaurant_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('weekday'); // 0=domingo .. 6=sábado
            $table->boolean('is_open')->default(true);

            $table->unique(['restaurant_id', 'weekday']);
        });

        Schema::create('restaurant_hour_ranges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_hours_id')->constrained('restaurant_hours')->cascadeOnDelete();
            $table->time('start_time');
            $table->time('end_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_hour_ranges');
        Schema::dropIfExists('restaurant_hours');
    }
};
