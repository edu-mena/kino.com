<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 2FA (TOTP) para operadores de sistema — auditoria de segurança, Fase 1.
 *
 * - `two_factor_secret`: segredo TOTP, cifrado com a APP_KEY (cast
 *   `encrypted` no model) — nunca em claro na BD.
 * - `two_factor_recovery_codes`: hashes (bcrypt) dos códigos de recuperação
 *   de uso único, cifrados como os outros; o código em claro só é mostrado
 *   uma vez, na ativação.
 * - `two_factor_last_step`: último passo de 30s aceite — impede reutilizar
 *   o mesmo código dentro da sua janela de validade (replay).
 *
 * Também alarga os `event` aceites em `system_security_events` (a coluna é
 * varchar + CHECK no Postgres, não um tipo enum nativo).
 */
return new class extends Migration
{
    private const EVENTS_BEFORE = ['page_view', 'login_attempt'];

    private const EVENTS_AFTER = ['page_view', 'login_attempt', 'two_factor', 'two_factor_enabled', 'recovery_codes_regenerated'];

    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('two_factor_secret')->nullable()->after('password');
            $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
            $table->unsignedBigInteger('two_factor_last_step')->nullable()->after('two_factor_confirmed_at');
        });

        $this->replaceEventCheck(self::EVENTS_AFTER);

        // Sessões de operador emitidas antes do 2FA (válidas até 90 dias)
        // deixam de valer já — senão o 2FA só protegeria logins futuros.
        DB::table('personal_access_tokens')
            ->where('tokenable_type', 'App\\Models\\User')
            ->whereIn('tokenable_id', DB::table('users')->where('role', 'system_operator')->select('id'))
            ->delete();
    }

    public function down(): void
    {
        DB::table('system_security_events')->whereNotIn('event', self::EVENTS_BEFORE)->delete();
        $this->replaceEventCheck(self::EVENTS_BEFORE);

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at', 'two_factor_last_step']);
        });
    }

    /** @param  list<string>  $events */
    private function replaceEventCheck(array $events): void
    {
        $list = implode(', ', array_map(fn ($e) => "'{$e}'", $events));

        DB::statement('ALTER TABLE system_security_events DROP CONSTRAINT IF EXISTS system_security_events_event_check');
        DB::statement("ALTER TABLE system_security_events ADD CONSTRAINT system_security_events_event_check CHECK (event::text IN ({$list}))");
    }
};
