<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Liga o pedido dine-in à reserva de mesa que o originou — a
            // caução já paga dessa reserva desconta automaticamente do
            // consumo (ver OrderPricingService::price). `nullOnDelete`:
            // apagar a reserva nunca deve apagar o pedido já feito.
            $table->foreignId('reservation_id')->nullable()->after('user_id')
                ->constrained()->nullOnDelete();
            // Snapshot do valor efetivamente descontado — mesmo raciocínio
            // de `delivery_address_snapshot`: fica congelado no pedido, não
            // recalcula se a reserva mudar depois.
            $table->decimal('reservation_credit', 10, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reservation_id');
            $table->dropColumn('reservation_credit');
        });
    }
};
