<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('customer_name');
            $table->unsignedTinyInteger('rating');
            $table->date('date');
            $table->text('comment')->nullable();
            $table->json('tags')->nullable();

            // Substitui a heurística de string "order:123" do mock por uma
            // constraint SQL real — impede duas reviews para o mesmo
            // pedido/reserva.
            $table->enum('ref_type', ['order', 'reservation'])->nullable();
            $table->unsignedBigInteger('ref_id')->nullable();

            $table->timestamps();

            $table->unique(['ref_type', 'ref_id']);
            $table->index('restaurant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
