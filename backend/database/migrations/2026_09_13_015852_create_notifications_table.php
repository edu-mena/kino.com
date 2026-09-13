<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Persistida e gerada por Observer em Order/Reservation (evento
     * `updated` com `status` dirty) — substitui a derivação por diffing
     * client-side do mock. Exatamente um de user_id/restaurant_id é
     * preenchido (o "scope" da notificação); reforçado por check constraint.
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('restaurant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->enum('kind', ['order', 'reservation']);
            $table->unsignedBigInteger('ref_id');
            $table->string('event'); // chave i18n, ex: "orderStatus"
            $table->string('status_snapshot');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
            $table->index(['restaurant_id', 'read_at']);
        });

        // Exatamente um dos dois scopes preenchido — nunca ambos, nunca nenhum.
        DB::statement(
            'ALTER TABLE notifications ADD CONSTRAINT notifications_scope_check '
            .'CHECK ((user_id IS NOT NULL) <> (restaurant_id IS NOT NULL))'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
