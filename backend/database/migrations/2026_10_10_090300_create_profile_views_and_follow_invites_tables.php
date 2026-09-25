<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Quem viu o seu perfil" passa a viver no servidor — antes só existia
     * no localStorage de quem visitava, por isso o restaurante nunca via as
     * visitas feitas noutros browsers.
     *
     * Uma linha por visitante único (conta, ou um id aleatório de
     * convidado), com o nº de visitas (sessões com 30 min de intervalo,
     * como o Google Analytics) — não pageviews.
     *
     * `follow_invites`: o restaurante pode convidar quem viu o perfil a
     * segui-lo. Uma linha por (restaurante, cliente) com o estado do último
     * convite — as regras anti-spam vivem em FollowInvitePolicy.
     */
    public function up(): void
    {
        Schema::create('profile_views', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // "user:{id}" para contas, "guest:{id aleatório do browser}" para convidados.
            $table->string('viewer_key', 120);
            $table->unsignedInteger('visits')->default(1);
            $table->timestamp('first_at');
            $table->timestamp('last_at');
            $table->timestamps();

            $table->unique(['restaurant_id', 'viewer_key']);
            $table->index(['restaurant_id', 'last_at']);
        });

        Schema::create('follow_invites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Nulo quando o cliente silenciou antes de receber qualquer convite.
            $table->timestamp('last_sent_at')->nullable();
            $table->timestamp('declined_at')->nullable();
            // Cliente pediu para não receber mais convites deste restaurante.
            $table->timestamp('muted_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();

            $table->unique(['restaurant_id', 'user_id']);
            $table->index(['restaurant_id', 'last_sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('follow_invites');
        Schema::dropIfExists('profile_views');
    }
};
