<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Pratos de buffet/self-service não têm preço individual (fazem parte de
 * uma taxa fixa, não de uma linha de pedido). `price` era `NOT NULL` desde
 * a criação da tabela — sem `doctrine/dbal` instalado, `->change()` não
 * funciona; a forma correta em Postgres é `ALTER COLUMN ... DROP NOT NULL`
 * diretamente (mesma técnica já usada para alterar o `CHECK` constraint de
 * `reservations.status`, ver migração do estado "no_show").
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE menu_items ALTER COLUMN price DROP NOT NULL');

        Schema::table('menu_items', function (Blueprint $table) {
            $table->boolean('is_buffet_only')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropColumn('is_buffet_only');
        });

        DB::statement('ALTER TABLE menu_items ALTER COLUMN price SET NOT NULL');
    }
};
