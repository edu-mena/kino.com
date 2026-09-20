<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Bloqueio de IP para o login de sistema (/sistema/entrar) — pedido
     * explícito do utilizador: "fechar" um endereço IP que tentar aceder
     * essa página. Um IP aqui é rejeitado ANTES de qualquer tentativa de
     * autenticação (ver EnsureIpNotBlocked), com resposta idêntica à de
     * credenciais inválidas — nunca revela ao atacante que foi bloqueado
     * especificamente (evita ensinar a mudar de IP e voltar a tentar).
     */
    public function up(): void
    {
        Schema::create('blocked_ips', function (Blueprint $table) {
            $table->id();
            $table->string('ip')->unique();
            // "auto:too_many_failed_attempts" ou "manual:email_link".
            $table->string('reason');
            $table->timestamp('blocked_at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_ips');
    }
};
