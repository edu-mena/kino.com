<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurants', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('cuisine')->nullable();
            $table->string('address')->nullable();
            // "neighborhood" no mock guarda na verdade a província angolana.
            $table->string('neighborhood')->nullable();
            $table->string('city')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();

            $table->string('cover_image_url')->nullable();

            $table->boolean('is_delivery_available')->default(false);
            // Enums pequenos e fixos (FulfillmentType/payment method codes) —
            // array em vez de tabela relacional própria, mesma decisão do
            // plano para não sobre-normalizar valores de catálogo estático.
            $table->jsonb('fulfillment_modes')->nullable();
            $table->jsonb('accepted_payment_methods')->nullable();
            // Quais fulfillment_modes exigem caução no pedido — mapeia 1:1
            // `Restaurant.cautionModesForOrders` do mock (ver plano, secção
            // "Modos de cumprimento e pagamento angolano").
            $table->jsonb('caution_modes_for_orders')->nullable();
            $table->jsonb('delivery_zones')->nullable();

            $table->decimal('delivery_fee', 10, 2)->default(0);
            $table->unsignedInteger('estimated_delivery_minutes')->nullable();
            $table->decimal('caution_amount', 10, 2)->default(0);
            $table->text('caution_policy_notice')->nullable();

            $table->boolean('is_featured')->default(false);
            $table->boolean('accepts_reservations')->default(true);
            $table->unsignedInteger('reservation_slot_minutes')->default(120);
            $table->boolean('orders_paused_manually')->default(false);

            // Desnormalizados e recalculados por job/evento (nunca editáveis
            // via API) — ver App\Services\PriceLevelCalculator e
            // App\Observers\ReviewObserver. Evita AVG()/JOIN caro em toda
            // listagem pública.
            $table->unsignedTinyInteger('price_level')->nullable();
            $table->decimal('rating', 2, 1)->nullable();
            $table->unsignedInteger('review_count')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index('city');
            $table->index('neighborhood');
            $table->index('is_featured');
            $table->index('cuisine');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurants');
    }
};
