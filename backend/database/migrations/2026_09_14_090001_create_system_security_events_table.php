<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Registo de auditoria de tudo o que toca o login de sistema — cada
     * visita à página `/sistema/entrar` (event=page_view, do frontend, ver
     * SystemAccessController::notify) e cada tentativa de login
     * (event=login_attempt, do AuthController::systemLogin). Fonte de
     * verdade para o email de alerta e para o contador de bloqueio
     * automático (ver EnsureIpNotBlocked / AuthController::systemLogin).
     */
    public function up(): void
    {
        Schema::create('system_security_events', function (Blueprint $table) {
            $table->id();
            $table->string('ip');
            $table->string('user_agent')->nullable();
            $table->enum('event', ['page_view', 'login_attempt']);
            $table->enum('outcome', ['success', 'failed'])->nullable();
            // Email submetido na tentativa — não necessariamente uma conta
            // real (nunca revela isso na resposta), só para o email de
            // alerta mostrar o que foi tentado.
            $table->string('email_attempted')->nullable();
            $table->timestamps();

            $table->index(['ip', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_security_events');
    }
};
