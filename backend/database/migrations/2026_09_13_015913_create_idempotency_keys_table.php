<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Suporte a `Idempotency-Key` em POST orders/reservations (revisão de
     * arquitetura — clientes mobile retentam em rede instável e sem isto
     * duplicam pedidos/reservas). Guardada em BD (não só Redis) para
     * sobreviver a um FLUSHDB acidental de cache; TTL de 24h aplicado por
     * job de limpeza (mesmo padrão de ExpireStoriesJob).
     */
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->id();
            // "user:{id}" ou "guest:{token}" — quem fez o pedido.
            $table->string('owner_key');
            $table->uuid('idempotency_key');
            $table->string('endpoint');
            $table->unsignedSmallInteger('response_status');
            $table->jsonb('response_body');
            $table->timestamps();

            $table->unique(['owner_key', 'idempotency_key', 'endpoint']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
