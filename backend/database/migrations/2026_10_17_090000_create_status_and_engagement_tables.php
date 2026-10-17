<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Página de estado (/estado) + avisos de incidente + notificações de
 * lembrete/reconquista. Ver App\Services\Status\StatusMonitor e
 * App\Services\Engagement\EngagementNotifier.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Um incidente = um período contínuo com pelo menos um serviço em
        // falha. `internal_error` é só para operadores (nunca sai na API
        // pública); `public_cause` é o texto editável que os utilizadores
        // leem na mensagem de resolução.
        Schema::create('status_incidents', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->json('components');
            $table->text('internal_error')->nullable();
            $table->string('public_cause', 160)->nullable();
            $table->timestamp('started_at');
            $table->timestamp('last_failure_at');
            $table->timestamp('recovering_since')->nullable();
            $table->timestamp('users_notified_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('resolution_notified_at')->nullable();
            $table->timestamps();

            $table->index('resolved_at');
        });

        // Agregado diário por serviço (minutos verificados / minutos OK) —
        // alimenta a barra de 90 dias da página de estado sem guardar uma
        // linha por minuto.
        Schema::create('status_daily', function (Blueprint $table) {
            $table->id();
            $table->string('component', 40);
            $table->date('date');
            $table->unsignedInteger('total_minutes')->default(0);
            $table->unsignedInteger('ok_minutes')->default(0);

            $table->unique(['component', 'date']);
        });

        // Quem quer receber os avisos de incidente por email (com dupla
        // confirmação — ninguém pode inscrever o email de outra pessoa).
        Schema::create('status_subscribers', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('token', 64)->unique();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });

        // Registo de cada lembrete/reconquista enviado: limites de
        // frequência (por dia/semana) e "nunca o mesmo lembrete duas vezes"
        // (`ref` = reserva/pedido/escalão de inatividade).
        Schema::create('engagement_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 40);
            $table->string('ref', 80)->nullable();
            $table->timestamp('sent_at');

            $table->index(['user_id', 'sent_at']);
            $table->unique(['user_id', 'kind', 'ref']);
        });

        Schema::table('user_preferences', function (Blueprint $table) {
            $table->boolean('engagement_notifications')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('user_preferences', function (Blueprint $table) {
            $table->dropColumn('engagement_notifications');
        });
        Schema::dropIfExists('engagement_notifications');
        Schema::dropIfExists('status_subscribers');
        Schema::dropIfExists('status_daily');
        Schema::dropIfExists('status_incidents');
    }
};
