<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Operadores de sistema (superadmin) — hoje hardcoded no código-fonte do
 * frontend (src/lib/system-admin.tsx), aqui passam a existir só na BD, sem
 * self-signup possível (ver plano, fluxo de auth "Sistema"). Roda uma vez
 * por deploy/onboarding de novo operador; é idempotente por email — nunca
 * reseta a senha de um operador já existente ao re-rodar.
 *
 * Nasce SEM senha utilizável (hash de algo aleatório, nunca mostrado a
 * ninguém) — em vez de gerar uma senha temporária só visível em quem correr
 * este comando (inútil para o segundo operador, que nunca vê esse
 * terminal), dispara logo o mesmo email de "definir senha" que o fluxo de
 * "esqueci a senha" já usa (ver AuthController::forgotPassword,
 * AppServiceProvider::boot — o link já aponta para /definir-senha no
 * frontend). Cada operador define a própria senha a partir do email.
 */
class OperatorSeeder extends Seeder
{
    public function run(): void
    {
        $operators = [
            ['name' => 'Christopher Rosinho', 'email' => 'rosinhosebastiao@gmail.com'],
            ['name' => 'Eduardo Mena', 'email' => 'e.mena.baptista@gmail.com'],
        ];

        foreach ($operators as $operator) {
            $existing = User::query()->where('email', $operator['email'])->first();
            if ($existing) {
                continue;
            }

            $user = User::query()->create([
                'role' => 'system_operator',
                'name' => $operator['name'],
                'email' => $operator['email'],
                'password' => Hash::make(Str::random(40)),
                'email_verified_at' => now(),
            ]);

            Password::sendResetLink(['email' => $user->email]);

            $this->command?->info(
                "Operador criado: {$operator['email']} — email de \"definir senha\" enviado."
            );
        }
    }
}
