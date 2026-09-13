<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Estafetas — cada restaurante gere a própria frota (a Luku não opera
     * uma partilhada, ver mock src/lib/couriers.tsx). `active_order_id`
     * aponta ao pedido em entrega (nullOnDelete: apagar um pedido não deixa
     * o estafeta preso a uma referência morta — não deveria acontecer na
     * prática, orders não têm delete real, mas a FK protege na mesma).
     */
    public function up(): void
    {
        Schema::create('couriers', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('phone');
            $table->enum('vehicle', ['moto', 'bicicleta', 'carro']);
            $table->string('zone')->nullable();
            $table->enum('status', ['disponivel', 'em_entrega', 'offline'])->default('disponivel');
            $table->foreignId('active_order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->timestamps();

            $table->index(['restaurant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('couriers');
    }
};
