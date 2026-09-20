<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Uma única tabela `users` para os 3 papéis da plataforma (customer,
     * restaurant_staff, system_operator) — todos partilham a mesma
     * infraestrutura de auth (Sanctum exige um único model Authenticatable),
     * e distinguir por `role` evita duplicar essa infraestrutura em 3
     * tabelas. A regra de negócio (customer só via Google, staff/operator só
     * via password) é aplicada na camada de aplicação, não no schema — ver
     * App\Models\User e App\Http\Controllers\Api\V1\AuthController.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->enum('role', ['customer', 'restaurant_staff', 'system_operator']);
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('avatar_url')->nullable();

            // Preenchido só para role=customer (login Google real).
            $table->string('google_id')->unique()->nullable();

            // Preenchido só para role=restaurant_staff|system_operator
            // (login email+senha real, nunca self-signup — ver plano).
            $table->string('password')->nullable();

            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            // Soft delete: histórico de pedidos/reservas de um user não pode
            // perder a FK se a conta for desativada.
            $table->softDeletes();

            $table->index('role');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
