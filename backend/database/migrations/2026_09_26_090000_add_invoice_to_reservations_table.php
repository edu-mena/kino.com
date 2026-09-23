<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            // Fatura emitida pelo restaurante — mesmo padrão de
            // payment_proof_url/_at, mas do lado do restaurante para o
            // cliente. Usada sobretudo para cobrar a caução de uma reserva
            // marcada "não compareceu" (ver migração seguinte).
            $table->string('invoice_url', 2048)->nullable();
            $table->timestamp('invoice_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn(['invoice_url', 'invoice_at']);
        });
    }
};
