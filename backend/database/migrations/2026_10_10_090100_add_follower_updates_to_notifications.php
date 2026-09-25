<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Notificações para quem segue um restaurante: `kind = restaurant`,
     * `ref_id` = o próprio restaurante (a notificação do cliente só tem
     * `user_id`, ver notifications_scope_check — o restaurante vem pelo
     * ref, como pedido/reserva já fazem).
     *
     * `followers_notified_at` em stories/ofertas: "já avisei os
     * seguidores disto" — reclamado de forma atómica (ver
     * FollowerBroadcaster::claim), para um vídeo que volta a processar
     * numa edição nunca avisar duas vezes.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check');
        DB::statement(
            'ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check '
            ."CHECK (kind::text IN ('order', 'reservation', 'restaurant'))"
        );

        Schema::table('restaurant_stories', function (Blueprint $table) {
            $table->timestamp('followers_notified_at')->nullable();
        });
        Schema::table('offers', function (Blueprint $table) {
            $table->timestamp('followers_notified_at')->nullable();
        });
    }

    public function down(): void
    {
        DB::table('notifications')->where('kind', 'restaurant')->delete();
        DB::statement('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check');
        DB::statement(
            'ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check '
            ."CHECK (kind::text IN ('order', 'reservation'))"
        );

        Schema::table('restaurant_stories', function (Blueprint $table) {
            $table->dropColumn('followers_notified_at');
        });
        Schema::table('offers', function (Blueprint $table) {
            $table->dropColumn('followers_notified_at');
        });
    }
};
