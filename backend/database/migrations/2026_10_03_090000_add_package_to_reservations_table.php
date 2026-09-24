<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reserva de pacote (Fase L3c) — reaproveita o mecanismo de caução já
 * existente (`caution_amount`/`caution_status`, comprovativo, confirmação,
 * fatura) em vez de duplicar esse pipeline inteiro. `restaurant_package_id`
 * nullOnDelete: apagar o pacote não apaga o histórico de reservas já
 * feitas com ele (mesma filosofia de `table_id`, ver comentário em
 * `RestaurantTableController::destroy`).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->string('reservation_kind')->default('table')->after('people_count');
            $table->foreignId('restaurant_package_id')->nullable()
                ->after('reservation_kind')
                ->constrained('restaurant_packages')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('restaurant_package_id');
            $table->dropColumn('reservation_kind');
        });
    }
};
