<?php

namespace App\Actions;

use App\Models\PartnerApplication;
use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use App\Models\RestaurantSubscription;
use Illuminate\Support\Facades\DB;

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
    public const TRIAL_DAYS = 60;

    public function __construct(private readonly FindOrCreateRestaurantOwner $owners) {}

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
                'lat' => $application->lat,
                'lng' => $application->lng,
            ]);

            RestaurantSubscription::query()->create([
                'restaurant_id' => $restaurant->id,
                // Trial dá acesso Plus completo (ver config/plans.php) —
                // decide-se Pro vs Plus a sério quando o trial acaba.
                'plan' => 'plus',
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

            $owner = $this->owners->handle($application->owner_name, $application->email, $application->phone);
            $restaurant->staff()->attach($owner->id, ['role_in_restaurant' => 'owner']);

            $application->update([
                'status' => 'approved',
                'created_restaurant_id' => $restaurant->id,
            ]);

            return $restaurant;
        });

        return $restaurant;
    }
}
