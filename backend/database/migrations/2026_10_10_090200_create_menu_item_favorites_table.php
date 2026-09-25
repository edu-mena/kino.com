<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Favoritos são só pratos e bebidas (restaurantes são seguidos, ver
     * restaurant_follows). Guardados no servidor para acompanharem a conta
     * entre dispositivos e alimentarem as recomendações por ingrediente/
     * composição.
     */
    public function up(): void
    {
        Schema::create('menu_item_favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_item_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'menu_item_id']);
            $table->index('menu_item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_item_favorites');
    }
};
