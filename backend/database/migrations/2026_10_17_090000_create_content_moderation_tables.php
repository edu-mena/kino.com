<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Moderação de conteúdo criado por utilizadores (App Store, guideline 1.2):
 * denunciar conteúdo ofensivo, a equipa Luku decidir, e cada cliente poder
 * bloquear quem o incomoda. Ver ContentReportController/UserBlockController.
 *
 * - `content_reports`: uma denúncia por pessoa por conteúdo (`reporter_key`
 *   = "user:<id>" ou "ip:<sha256>" para convidados — nunca o IP em claro).
 * - `reviews.hidden_at`: avaliação escondida do público — automaticamente
 *   ao juntar denúncias de várias pessoas (até a equipa decidir), ou pela
 *   própria equipa.
 * - `user_blocks`: quem bloqueou quem — as avaliações do bloqueado deixam de
 *   aparecer a quem bloqueou.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_reports', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('reportable_type', 20); // review | story | offer
            $table->unsignedBigInteger('reportable_id');
            $table->foreignId('reporter_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reporter_key', 80);
            $table->string('reason', 20);
            $table->text('details')->nullable();
            $table->string('status', 20)->default('pending'); // pending | removed | dismissed
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->unique(['reportable_type', 'reportable_id', 'reporter_key']);
            $table->index(['status', 'created_at']);
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->timestamp('hidden_at')->nullable();
        });

        Schema::create('user_blocks', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('blocked_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'blocked_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_blocks');
        Schema::table('reviews', fn (Blueprint $table) => $table->dropColumn('hidden_at'));
        Schema::dropIfExists('content_reports');
    }
};
