<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('offers', function (Blueprint $table) {
            // Ambos vazios/nulos = promoção do pedido inteiro (comportamento
            // de sempre). Guardados como uuid/texto direto — o mesmo que
            // MenuItem::uuid/category já expõem, sem precisar resolver para
            // id interno em nenhum lado (ver OrderPricingService::price).
            $table->jsonb('target_menu_item_ids')->nullable();
            $table->jsonb('target_categories')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('offers', function (Blueprint $table) {
            $table->dropColumn(['target_menu_item_ids', 'target_categories']);
        });
    }
};
