<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Iniciar sessão com Apple" (App Store, guideline 4.8) — ver
 * AppleSignInService. `apple_id` é o `sub` estável da Apple para esta app;
 * `apple_token` guarda (cifrado) o refresh token + client_id, a única forma
 * de revogar o acesso quando o cliente apaga a conta (guideline 5.1.1(v)).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('apple_id')->nullable()->unique()->after('google_id');
            $table->text('apple_token')->nullable()->after('apple_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['apple_id']);
            $table->dropColumn(['apple_id', 'apple_token']);
        });
    }
};
