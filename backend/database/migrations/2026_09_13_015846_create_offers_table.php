<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            // NULL = promoção global da Luku (gerida em /sistema/promocoes,
            // nunca editável no painel do restaurante).
            $table->foreignId('restaurant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->enum('type', ['discount', 'delivery', 'happy-hour']);
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('code')->nullable()->unique();
            $table->unsignedTinyInteger('percent_off')->nullable();
            $table->string('image_url')->nullable();
            $table->enum('media_type', ['image', 'video'])->default('image');
            $table->string('thumbnail_url')->nullable();
            $table->enum('layout', ['split', 'cover'])->nullable();

            // Campo novo face ao mock (nunca expirava sozinho) — requisito
            // explícito do plano.
            $table->timestamp('starts_at')->useCurrent();
            $table->timestamp('ends_at')->nullable();

            $table->timestamps();

            $table->index('restaurant_id');
            $table->index('ends_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offers');
    }
};
