<?php

namespace App\Actions;

use App\Models\PartnerApplication;
use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use App\Models\RestaurantSubscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Aprovar uma candidatura (ver mock, sistema.parceiros.tsx `onboard()`) cria
 * de facto um restaurante operacional: Restaurant + RestaurantSubscription
 * (trial, 60 dias — mesmo valor do mock, TRIAL_DAYS) + 3 mesas iniciais +
 * 1 cardápio principal (sem isto não há onde criar pratos) + a conta do
 * dono. O mock não tinha conta real nenhuma (só "escolher
 * restaurante" na sessão fake) — aqui isso passa a ser uma conta de
 * restaurant_staff/owner a sério, convidada por email com o MESMO fluxo de
 * "definir senha" do esqueci-a-senha (AuthController::forgotPassword) —
 * nunca manda a senha aleatória gerada em claro por email.
 */
class ApprovePartnerApplication
{
    private const TRIAL_DAYS = 60;

    public function handle(PartnerApplication $application): Restaurant
    {
        $restaurant = DB::transaction(function () use ($application) {
            $restaurant = Restaurant::query()->create([
                'name' => $application->restaurant_name,
                'neighborhood' => $application->province,
                'city' => $application->province,
                'phone' => $application->phone,
                'email' => $application->email,
                'cover_image_url' => $application->photo_url,
            ]);

            RestaurantSubscription::query()->create([
                'restaurant_id' => $restaurant->id,
                'plan' => 'luku',
                'started_at' => now(),
                'trial_ends_at' => now()->addDays(self::TRIAL_DAYS),
                'status' => 'trial',
            ]);

            foreach ([['Mesa 1', 4], ['Mesa 2', 2], ['Mesa 3', 6]] as [$name, $seats]) {
                $restaurant->tables()->create(['name' => $name, 'seats' => $seats, 'area' => 'Interior']);
            }

            // Sem isto, o painel do restaurante não tem onde criar pratos —
            // `menu_id` é obrigatório em StoreMenuItemRequest.
            RestaurantMenu::query()->create([
                'restaurant_id' => $restaurant->id,
                'name' => 'Cardápio Principal',
                'is_active' => true,
            ]);

            $owner = $this->findOrCreateOwner($application);
            $restaurant->staff()->attach($owner->id, ['role_in_restaurant' => 'owner']);

            $application->update([
                'status' => 'approved',
                'created_restaurant_id' => $restaurant->id,
            ]);

            return $restaurant;
        });

        return $restaurant;
    }

    /**
     * O mesmo email já pode ter uma conta de staff de outro restaurante
     * (dono com vários locais candidatando-se de novo) — nesse caso liga a
     * conta existente em vez de duplicar/falhar por email único, e não
     * reenvia convite (já sabe entrar).
     *
     * `email` é único GLOBALMENTE na tabela `users`, independente de `role`
     * — se o candidato já tiver conta de cliente (ou, mais raro, de
     * operador) com este mesmo email, a query abaixo (antes filtrada só por
     * `role = restaurant_staff`) não encontrava essa conta e a seguir tentava
     * CRIAR outra com o mesmo email, rebentando com uma violação de
     * constraint única (500 cru, sem mensagem nenhuma para o operador —
     * bug real, encontrado ao aprovar uma candidatura a sério em produção).
     * `role` é exclusivo por design (uma conta é OU cliente OU staff OU
     * operador, nunca duas ao mesmo tempo), por isso não dá para "juntar"
     * as duas contas aqui sem risco — falha alto e cedo com uma mensagem
     * clara em vez de tentar adivinhar o que o operador queria.
     */
    private function findOrCreateOwner(PartnerApplication $application): User
    {
        $existing = User::query()->where('email', $application->email)->first();

        if ($existing && $existing->role === 'restaurant_staff') {
            return $existing;
        }

        if ($existing) {
            $roleLabel = match ($existing->role) {
                'customer' => 'cliente',
                'system_operator' => 'operador de sistema',
                default => $existing->role,
            };

            abort(422, "Este email já pertence a uma conta de {$roleLabel} — não é possível usá-lo para o dono do restaurante. Peça ao candidato um email diferente, ou mude o role dessa conta manualmente antes de aprovar de novo.");
        }

        $user = User::query()->create([
            'role' => 'restaurant_staff',
            'name' => $application->owner_name,
            'email' => $application->email,
            'phone' => $application->phone,
            // Senha aleatória, nunca comunicada — o dono define a própria a
            // seguir, pelo link enviado por Password::sendResetLink().
            'password' => Hash::make(Str::random(40)),
        ]);

        Password::sendResetLink(['email' => $user->email]);

        return $user;
    }
}
