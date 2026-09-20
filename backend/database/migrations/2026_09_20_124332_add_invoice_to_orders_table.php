<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Fatura emitida pelo restaurante — mesmo padrão de
            // payment_proof_url/_at (ver storePaymentProof), mas do lado do
            // restaurante para o cliente, não do cliente para o restaurante.
            $table->string('invoice_url', 2048)->nullable();
            $table->string('invoice_type', 20)->nullable();
            $table->timestamp('invoice_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['invoice_url', 'invoice_type', 'invoice_at']);
        });
    }
};
