<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Substitui o plano único `"luku"` por dois planos (Pro/Plus, ver
 * `config/plans.php`). Decisão do utilizador: restaurantes já activos hoje
 * passam para Plus (mantêm tudo o que já usavam) E entram de novo em trial
 * por mais 60 dias, para experimentarem o Plus completo antes de
 * escolherem/pagarem um plano a sério — ninguém fica preso a um preço
 * antigo, o trial é que resolve a transição.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('restaurant_subscriptions')
            ->where('plan', 'luku')
            ->update([
                'plan' => 'plus',
                'status' => 'trial',
                'trial_ends_at' => now()->addDays(60),
            ]);

        Schema::table('restaurant_subscriptions', function (Blueprint $table) {
            $table->string('plan')->default('plus')->change();
        });
    }

    public function down(): void
    {
        Schema::table('restaurant_subscriptions', function (Blueprint $table) {
            $table->string('plan')->default('luku')->change();
        });

        DB::table('restaurant_subscriptions')
            ->whereIn('plan', ['pro', 'plus'])
            ->update(['plan' => 'luku']);
    }
};
