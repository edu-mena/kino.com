<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pedido feito a partir do QR de uma mesa leva a mesa: FK para o painel e
 * `table_label` como fotografia do nome no momento do pedido (sobrevive a
 * renomear/apagar a mesa). O restaurante ganha logótipo (cartões QR e
 * página do cardápio) e o estilo de impressão dos QR, guardado para que a
 * reimpressão de uma mesa saia igual às outras.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('restaurant_table_id')->nullable()->after('party_size')
                ->constrained()->nullOnDelete();
            $table->string('table_label', 80)->nullable()->after('restaurant_table_id');
        });

        Schema::table('restaurants', function (Blueprint $table) {
            $table->string('logo_url', 2048)->nullable()->after('wallpaper_url');
            $table->json('qr_style')->nullable()->after('logo_url');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('restaurant_table_id');
            $table->dropColumn('table_label');
        });

        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropColumn(['logo_url', 'qr_style']);
        });
    }
};
