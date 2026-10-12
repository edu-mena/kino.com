<?php

namespace App\Actions;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Conta do dono de um restaurante — partilhada pela aprovação de
 * candidaturas (ApprovePartnerApplication) e pela ativação de restaurantes
 * pré-cadastrados (ActivateImportedRestaurant).
 *
 * O mesmo email já pode ter uma conta de staff de outro restaurante (dono
 * com vários locais) — nesse caso liga a conta existente em vez de
 * duplicar/falhar por email único, e não reenvia convite (já sabe entrar).
 *
 * `email` é único GLOBALMENTE na tabela `users`, independente de `role` —
 * se o email já pertencer a uma conta de cliente (ou, mais raro, de
 * operador), falha alto e cedo com uma mensagem clara em vez de tentar
 * "juntar" contas de papéis diferentes (bug real encontrado em produção:
 * antes rebentava com um 500 cru de constraint única).
 *
 * Conta nova: senha aleatória nunca comunicada — o dono define a dele pelo
 * link de "definir senha" (mesmo fluxo do esqueci-a-senha).
 */
class FindOrCreateRestaurantOwner
{
    public function handle(string $name, string $email, ?string $phone = null): User
    {
        $existing = User::query()->where('email', $email)->first();

        if ($existing && $existing->role === 'restaurant_staff') {
            return $existing;
        }

        if ($existing) {
            $roleLabel = match ($existing->role) {
                'customer' => 'cliente',
                'system_operator' => 'operador de sistema',
                default => $existing->role,
            };

            abort(422, "Este email já pertence a uma conta de {$roleLabel} — não é possível usá-lo para o dono do restaurante. Use um email diferente, ou mude o role dessa conta manualmente antes de tentar de novo.");
        }

        $user = User::query()->create([
            'role' => 'restaurant_staff',
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'password' => Hash::make(Str::random(40)),
        ]);

        Password::sendResetLink(['email' => $user->email]);

        return $user;
    }
}
