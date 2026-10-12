<?php

use App\Models\QrCode;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Códigos curtos dos QR impressos (`luku.ao/q/{code}`) — um geral por
 * restaurante e um por mesa. Curtos de propósito: um URL pequeno dá um QR
 * menos denso, que se lê melhor impresso pequeno e com o logótipo ao centro.
 *
 * Um QR impresso dura anos: apagar a mesa NÃO apaga o código
 * (`nullOnDelete`) — passa a abrir o cardápio do restaurante sem mesa, em
 * vez de um erro.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qr_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 16)->unique();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('restaurant_table_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->string('kind', 16);
            $table->unsignedInteger('scans')->default(0);
            $table->timestamp('last_scanned_at')->nullable();
            $table->timestamps();

            $table->index(['restaurant_id', 'kind']);
        });

        $now = now();
        foreach (DB::table('restaurants')->pluck('id') as $restaurantId) {
            DB::table('qr_codes')->insert([
                'code' => QrCode::generateUniqueCode(),
                'restaurant_id' => $restaurantId,
                'restaurant_table_id' => null,
                'kind' => QrCode::KIND_RESTAURANT,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
        foreach (DB::table('restaurant_tables')->get(['id', 'restaurant_id']) as $row) {
            DB::table('qr_codes')->insert([
                'code' => QrCode::generateUniqueCode(),
                'restaurant_id' => $row->restaurant_id,
                'restaurant_table_id' => $row->id,
                'kind' => QrCode::KIND_TABLE,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('qr_codes');
    }
};
