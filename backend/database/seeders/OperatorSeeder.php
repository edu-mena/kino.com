<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Operadores de sistema (superadmin) — hoje hardcoded no código-fonte do
 * frontend (src/lib/system-admin.tsx), aqui passam a existir só na BD, sem
 * self-signup possível (ver plano, fluxo de auth "Sistema"). Roda uma vez
 * por deploy/onboarding de novo operador; é idempotente por email — nunca
 * reseta a senha de um operador já existente ao re-rodar.
 */
class OperatorSeeder extends Seeder
{
    public function run(): void
    {
        $operators = [
            ['name' => 'Christopher Rosinho', 'email' => 'rosinho@luku.com'],
            ['name' => 'Eduardo Mena', 'email' => 'mena@luku.com'],
        ];

        foreach ($operators as $operator) {
            $existing = User::query()->where('email', $operator['email'])->first();
            if ($existing) {
                continue;
            }

            $tempPassword = Str::password(16);

            User::query()->create([
                'role' => 'system_operator',
                'name' => $operator['name'],
                'email' => $operator['email'],
                'password' => Hash::make($tempPassword),
                'email_verified_at' => now(),
            ]);

            $this->command?->warn(
                "Operador criado: {$operator['email']} — senha temporária (guarda agora, não é mostrada de novo): {$tempPassword}"
            );
        }
    }
}
