<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            // Email ou telefone normalizado — mesma heurística de agrupamento
            // do mock (App\Services\CustomerAggregateService), agora persistida.
            $table->string('customer_key');
            $table->text('notes');
            $table->timestamps();

            $table->unique(['restaurant_id', 'customer_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_notes');
    }
};
