<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            // Mesmo padrão dos campos equivalentes em `orders` — o código
            // promocional passa a poder descontar a caução da reserva
            // também (Fase K2). Só promoções SEM prato/categoria alvo (a
            // caução não é itemizada) e que não sejam "delivery" (entrega
            // grátis não se aplica a uma reserva) são aceites — ver
            // ReservationController::store.
            $table->string('promo_code')->nullable();
            $table->string('promo_label')->nullable();
            $table->unsignedTinyInteger('promo_percent_off')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn(['promo_code', 'promo_label', 'promo_percent_off']);
        });
    }
};
