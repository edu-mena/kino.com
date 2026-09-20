<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->uuid('guest_token')->nullable()->unique();

            $table->enum('fulfillment_type', ['delivery', 'takeaway', 'dinein']);

            $table->string('customer_name');
            $table->string('customer_phone');
            $table->string('customer_email')->nullable();

            // Snapshot da morada no momento do pedido — nunca FK para uma
            // morada editável (o pedido não pode "mudar de endereço"
            // retroativamente se o cliente editar/apagar a morada salva
            // depois). Ver plano, tabela `orders`.
            $table->jsonb('delivery_address_snapshot')->nullable();
            $table->boolean('pickup_asap')->nullable();
            $table->timestamp('pickup_at')->nullable();
            $table->unsignedInteger('party_size')->nullable();

            $table->enum('status', [
                'pending', 'accepted', 'on_the_way', 'delivered',
                'ready', 'completed', 'rejected', 'canceled',
            ])->default('pending');

            $table->unsignedInteger('estimated_minutes')->nullable();
            $table->timestamp('delivered_at')->nullable();

            $table->string('payment_method_code')->nullable();
            $table->foreign('payment_method_code')->references('code')->on('payment_methods')->nullOnDelete();
            $table->decimal('caution_required', 10, 2)->nullable();

            $table->text('note')->nullable();

            $table->string('promo_code')->nullable();
            $table->string('promo_label')->nullable();
            $table->unsignedTinyInteger('promo_percent_off')->nullable();
            $table->boolean('promo_free_delivery')->default(false);

            $table->string('payment_proof_url')->nullable();
            $table->timestamp('payment_proof_at')->nullable();

            // Congelados no momento da criação — nunca recalculados depois
            // (corrige o bug do mock, onde o total recalcula do preço atual
            // do prato). Ver order_lines para o snapshot por linha.
            $table->decimal('subtotal', 10, 2);
            $table->decimal('delivery_fee', 10, 2)->default(0);
            $table->decimal('total', 10, 2);

            $table->timestamps();

            $table->index(['restaurant_id', 'status']);
            $table->index('user_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
