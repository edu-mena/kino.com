<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Resolve o bug real do mock: hoje o preço de um pedido é recalculado em
     * runtime a partir de `MenuItem.price` atual, então pedidos antigos
     * "mudam de preço" se o restaurante editar o cardápio depois. Aqui o
     * nome/preço/ingredientes selecionados são gravados como snapshot no
     * momento da criação — nunca recalculados.
     */
    public function up(): void
    {
        Schema::create('order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            // Nullable: sobrevive a soft-delete do prato original.
            $table->foreignId('menu_item_id')->nullable()->constrained()->nullOnDelete();

            $table->string('item_name_snapshot');
            $table->decimal('unit_price_snapshot', 10, 2);
            $table->unsignedInteger('qty');
            // [{id,name,included,extraPrice}] — snapshot também, mesmo motivo.
            $table->jsonb('line_ingredients')->nullable();
            $table->decimal('line_total', 10, 2);

            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_lines');
    }
};
