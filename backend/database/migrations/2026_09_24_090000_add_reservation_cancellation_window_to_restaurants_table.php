<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            // Minutos após a CONFIRMAÇÃO em que o cliente ainda pode
            // cancelar sozinho uma reserva já confirmada (ver
            // ReservationController::cancel) — mesmo padrão de
            // `reservation_slot_minutes`. Default 30: já vem utilizável sem
            // nenhuma configuração; `0` desliga o cancelamento pós-
            // confirmação (comportamento de antes desta coluna existir).
            $table->unsignedInteger('reservation_cancellation_window_minutes')->default(30);
        });
    }

    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropColumn('reservation_cancellation_window_minutes');
        });
    }
};
