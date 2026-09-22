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
 *
 * `email` é único na tabela — se a pessoa já tinha conta de cliente com
 * este email (ex: já usou a app como cliente via Google antes de se tornar
 * operador, caso real encontrado ao rodar isto), PROMOVE essa conta em vez
 * de tentar criar uma segunda linha (que rebentaria a constraint). Seguro:
 * nenhum código do lado do cliente lê `role` (ver UserResource/auth.tsx), e
 * o login Google continua a encontrar a mesma conta pelo `google_id`
 * independentemente do `role` — só passa a também ter acesso de operador.
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

            if ($existing?->role === 'system_operator') {
                continue; // já é operador — idempotente, não reenvia o email
            }

            if ($existing) {
                $previousRole = $existing->role;
                $existing->forceFill([
                    'role' => 'system_operator',
                    'password' => Hash::make(Str::random(40)),
                ])->save();
                Password::sendResetLink(['email' => $existing->email]);
                $this->command?->info(
                    "Operador promovido (já existia como '{$previousRole}'): {$operator['email']} — email de \"definir senha\" enviado."
                );

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
