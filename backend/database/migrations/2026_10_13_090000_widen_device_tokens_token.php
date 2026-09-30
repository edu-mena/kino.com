<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `token` era varchar(255): uma subscrição Web Push guardada em JSON
 * (endpoint + chaves p256dh/auth) passa facilmente disso — o INSERT falhava
 * com 500 e ativar as notificações dava sempre erro. `text` não tem limite;
 * o índice único (user_id, token) continua válido no Postgres.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('device_tokens', function (Blueprint $table) {
            $table->text('token')->change();
        });
    }

    public function down(): void
    {
        Schema::table('device_tokens', function (Blueprint $table) {
            $table->string('token')->change();
        });
    }
};
