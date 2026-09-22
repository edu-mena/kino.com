<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * O painel do restaurante (/admin/stories) sempre teve legenda ("text")
     * e link opcionais por cima da media — só nunca tinham colunas aqui,
     * então eram descartados ao ligar a Fase 4 (stories) à API real. Ambos
     * nullable: nem toda story tem legenda/link.
     */
    public function up(): void
    {
        Schema::table('restaurant_stories', function (Blueprint $table) {
            $table->string('text', 140)->nullable()->after('duration_sec');
            $table->string('link', 2048)->nullable()->after('text');
        });
    }

    public function down(): void
    {
        Schema::table('restaurant_stories', function (Blueprint $table) {
            $table->dropColumn(['text', 'link']);
        });
    }
};
