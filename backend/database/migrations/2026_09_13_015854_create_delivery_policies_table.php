<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Singleton global da plataforma — sempre id=1, gerido em /sistema/operacao. */
    public function up(): void
    {
        Schema::create('delivery_policies', function (Blueprint $table) {
            $table->id();
            $table->decimal('free_radius_km', 6, 2);
            $table->decimal('per_km_surcharge_kz', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_policies');
    }
};
