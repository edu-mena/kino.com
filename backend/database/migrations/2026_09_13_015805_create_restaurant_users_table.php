<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Junção N:N users↔restaurants — um restaurante pode ter vários
     * funcionários (dono + staff), e no futuro uma pessoa poderia gerir mais
     * de um restaurante. `role_in_restaurant` é a autorização grossa checada
     * pelas Policies (ex: só "owner" edita payment-details/convida staff).
     */
    public function up(): void
    {
        Schema::create('restaurant_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('role_in_restaurant', ['owner', 'manager', 'staff']);
            $table->timestamps();

            $table->unique(['restaurant_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_users');
    }
};
