<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * O restaurante ESCOLHE quais tipos de pacote (Aniversário, Reunião de
 * Negócios...) oferece, com o preço/detalhes próprios — o tipo em si vem do
 * catálogo `package_types` (Fase L3a), gerido pela equipa Luku. `title`
 * nulo usa o nome do tipo (ver plano); `package_type_id` em cascade — se a
 * equipa Luku apagar um tipo, os pacotes que o usavam somem com ele, mesmo
 * comportamento já usado em `restaurant_payment_details.payment_method_code`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurant_packages', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('package_type_id')->constrained()->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->string('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->unsignedInteger('max_people')->nullable();
            $table->jsonb('characteristics')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('restaurant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_packages');
    }
};
