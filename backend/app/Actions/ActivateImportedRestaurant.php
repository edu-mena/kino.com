<?php

namespace App\Actions;

use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use App\Models\RestaurantSubscription;
use App\Support\RestaurantIndexCache;
use Illuminate\Support\Facades\DB;

/**
 * Ativar um restaurante pré-cadastrado (importado do menus.ao): passa a
 * público, ganha subscrição em período grátis, mesas iniciais e a conta do
 * dono (convite de "definir senha" por email) — o mesmo que a aprovação de
 * uma candidatura cria, mas com o cardápio já feito.
 *
 * Os contactos recolhidos na importação são privados; só passam para o
 * perfil público se o operador o escolher aqui.
 */
class ActivateImportedRestaurant
{
    public function __construct(private readonly FindOrCreateRestaurantOwner $owners) {}

    /**
     * @param  array{owner_name: string, owner_email: string, owner_phone?: ?string, public_phone?: ?string, public_email?: ?string}  $data
     */
    public function handle(Restaurant $restaurant, array $data): Restaurant
    {
        abort_if($restaurant->is_published, 422, 'Este restaurante já está ativo.');
        $import = $restaurant->import;
        abort_if($import?->discarded_at !== null, 422, 'Este restaurante foi descartado.');

        DB::transaction(function () use ($restaurant, $data, $import) {
            if (! $restaurant->subscription()->exists()) {
                RestaurantSubscription::query()->create([
                    'restaurant_id' => $restaurant->id,
                    'plan' => 'plus',
                    'started_at' => now(),
                    'trial_ends_at' => now()->addDays(ApprovePartnerApplication::TRIAL_DAYS),
                    'status' => 'trial',
                ]);
            }

            if ($restaurant->tables()->doesntExist()) {
                foreach ([['Mesa 1', 4], ['Mesa 2', 2], ['Mesa 3', 6]] as [$name, $seats]) {
                    $restaurant->tables()->create(['name' => $name, 'seats' => $seats, 'area' => 'Interior']);
                }
            }

            if (RestaurantMenu::query()->where('restaurant_id', $restaurant->id)->doesntExist()) {
                RestaurantMenu::query()->create([
                    'restaurant_id' => $restaurant->id,
                    'name' => 'Cardápio Principal',
                    'is_active' => true,
                ]);
            }

            $owner = $this->owners->handle($data['owner_name'], $data['owner_email'], $data['owner_phone'] ?? null);
            $restaurant->staff()->syncWithoutDetaching([$owner->id => ['role_in_restaurant' => 'owner']]);

            $restaurant->forceFill([
                'is_published' => true,
                'phone' => $data['public_phone'] ?? null,
                'email' => $data['public_email'] ?? null,
            ])->save();

            $import?->update(['activated_at' => now()]);
        });

        RestaurantIndexCache::forget();

        return $restaurant->refresh();
    }
}
