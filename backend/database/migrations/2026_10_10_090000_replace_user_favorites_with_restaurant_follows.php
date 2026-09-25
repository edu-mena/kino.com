<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * O cliente deixa de "favoritar" restaurantes e passa a SEGUI-los —
     * favoritos ficam só para pratos/bebidas (recomendações por
     * ingrediente). Seguir é pedir atualizações: `notify` é o sino por
     * restaurante (Instagram-like), desligável sem deixar de seguir.
     *
     * Quem já tinha o restaurante nos favoritos passa a segui-lo — ninguém
     * perde o que tinha guardado.
     */
    public function up(): void
    {
        Schema::create('restaurant_follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->boolean('notify')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'restaurant_id']);
            $table->index(['restaurant_id', 'notify']);
        });

        DB::statement(
            'INSERT INTO restaurant_follows (user_id, restaurant_id, notify, created_at, updated_at) '
            .'SELECT user_id, restaurant_id, true, created_at, updated_at FROM user_favorites'
        );

        Schema::dropIfExists('user_favorites');
    }

    public function down(): void
    {
        Schema::create('user_favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'restaurant_id']);
            $table->index('restaurant_id');
        });

        DB::statement(
            'INSERT INTO user_favorites (user_id, restaurant_id, created_at, updated_at) '
            .'SELECT user_id, restaurant_id, created_at, updated_at FROM restaurant_follows'
        );

        Schema::dropIfExists('restaurant_follows');
    }
};
