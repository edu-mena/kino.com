<?php

namespace App\Actions;

use App\Models\PartnerApplication;
use App\Models\Restaurant;
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
 * a conta do dono. O mock não tinha conta real nenhuma (só "escolher
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
     */
    private function findOrCreateOwner(PartnerApplication $application): User
    {
        $existing = User::query()
            ->where('role', 'restaurant_staff')
            ->where('email', $application->email)
            ->first();

        if ($existing) {
            return $existing;
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
