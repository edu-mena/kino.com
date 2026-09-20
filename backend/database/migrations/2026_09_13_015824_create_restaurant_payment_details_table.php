<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** IBAN/telefone/carteira que o restaurante disponibiliza para cada
     * método de pagamento que aceita — mostrado ao cliente em /entrega
     * depois do restaurante fixar o método ao aceitar o pedido. */
    public function up(): void
    {
        Schema::create('restaurant_payment_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->string('payment_method_code');
            $table->foreign('payment_method_code')->references('code')->on('payment_methods')->cascadeOnDelete();
            $table->text('details');
            $table->timestamps();

            $table->unique(['restaurant_id', 'payment_method_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_payment_details');
    }
};
