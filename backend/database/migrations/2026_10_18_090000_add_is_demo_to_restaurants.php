<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Restaurante de demonstração para os revisores da App Store / Google Play
 * (ver o comando `store:demo-restaurant`). Fica fora de toda a descoberta
 * pública (listagem, stories/promoções globais, pacotes, estatísticas do
 * site) — só aparece a quem pesquisar o nome exato, e abre por link direto.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->boolean('is_demo')->default(false)->index();
        });
    }

    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropIndex(['is_demo']);
            $table->dropColumn('is_demo');
        });
    }
};
