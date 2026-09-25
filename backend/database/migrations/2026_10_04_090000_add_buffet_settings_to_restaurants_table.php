<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Um prato marcado `is_buffet_only` (Fase L2) não tinha nenhuma informação
 * do buffet em si — preço da taxa fixa, horário, tempo de mesa — visível em
 * lado nenhum. O restaurante só pode ter UM buffet (decisão confirmada com
 * o utilizador); `buffet_price` nulo = o restaurante não configurou preço
 * ainda, mesmo que já tenha pratos marcados como buffet.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->decimal('buffet_price', 10, 2)->nullable();
            $table->string('buffet_hours_notice')->nullable();
            $table->unsignedInteger('buffet_table_time_limit_minutes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropColumn(['buffet_price', 'buffet_hours_notice', 'buffet_table_time_limit_minutes']);
        });
    }
};
