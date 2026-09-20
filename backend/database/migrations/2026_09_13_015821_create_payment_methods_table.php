<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catálogo estático da app (não é dado do restaurante) — os 7 métodos de
     * pagamento angolanos já usados no mock (ver App\Data\PaymentMethodSeeder
     * / database seeder). Nunca editável via API pública.
     */
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->string('code')->primary();
            $table->string('name');
            $table->boolean('is_digital')->default(true);
            $table->unsignedInteger('position')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
