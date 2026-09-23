<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            // Comprovativo de pagamento da caução, carregado pelo cliente —
            // mesmas colunas de orders.payment_proof_url/_at (ver
            // OrderController::storePaymentProof). Antes disto não havia
            // forma nenhuma de o cliente enviar comprovativo da caução da
            // reserva.
            $table->string('payment_proof_url')->nullable();
            $table->timestamp('payment_proof_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn(['payment_proof_url', 'payment_proof_at']);
        });
    }
};
