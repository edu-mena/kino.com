<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Restaurantes gerados em lote (`restaurants:seed-demo`) — o lote permite
 * desativar/apagar só esses, nunca um restaurante real. Ver
 * App\Services\SeededRestaurants.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->string('seed_batch', 40)->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropIndex(['seed_batch']);
            $table->dropColumn('seed_batch');
        });
    }
};
