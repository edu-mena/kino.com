<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // O cliente pede fatura com NIF no momento do pedido (ver plano)
            // — antes disto, `invoice_type` só existia do lado do
            // restaurante, escolhido às cegas ao emitir a fatura, sem
            // nenhuma informação de qual empresa/NIF usar.
            $table->boolean('wants_nif_invoice')->default(false);
            // Snapshot (nome/nif/email) TAL COMO ESTAVAM no momento do
            // pedido — mesmo padrão de `delivery_address_snapshot`; a
            // empresa pode ser editada/apagada depois sem afetar pedidos já
            // feitos.
            $table->jsonb('invoice_company_snapshot')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['wants_nif_invoice', 'invoice_company_snapshot']);
        });
    }
};
