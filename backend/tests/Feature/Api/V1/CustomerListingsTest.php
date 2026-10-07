<?php

use App\Models\MenuItem;
use App\Models\Order;
use App\Models\PackageType;
use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use App\Models\RestaurantPackage;
use App\Models\RestaurantSubscription;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Str;

/** Prato no cardápio do próprio restaurante (a factory criaria outro). */
function dishOf(Restaurant $restaurant, array $attributes = []): MenuItem
{
    $menu = RestaurantMenu::factory()->create(['restaurant_id' => $restaurant->id]);

    return MenuItem::factory()->create([
        'restaurant_id' => $restaurant->id,
        'menu_id' => $menu->id,
        ...$attributes,
    ]);
}

function suspend(Restaurant $restaurant): void
{
    RestaurantSubscription::query()->create([
        'restaurant_id' => $restaurant->id, 'plan' => 'pro',
        'started_at' => now()->subMonths(3), 'trial_ends_at' => now()->subMonths(1), 'status' => 'suspended',
    ]);
}

/** Pedido com uma linha deste prato, no estado/data pedidos. */
function orderWith(MenuItem $dish, string $status = 'delivered', ?CarbonInterface $at = null): Order
{
    $order = $dish->restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'Cliente', 'customer_phone' => '900000000',
        'pickup_asap' => true, 'status' => $status, 'subtotal' => 1000, 'total' => 1000,
        'guest_token' => Str::uuid(),
    ]);
    $order->lines()->create([
        'menu_item_id' => $dish->id, 'item_name_snapshot' => $dish->name,
        'unit_price_snapshot' => 1000, 'qty' => 1, 'line_total' => 1000,
    ]);
    if ($at) {
        $order->forceFill(['created_at' => $at])->save();
    }

    return $order;
}

test('catálogo devolve os pratos de todos os restaurantes ativos num só pedido', function () {
    $a = Restaurant::factory()->create();
    $b = Restaurant::factory()->create();
    $dishA = dishOf($a, ['name' => 'Muamba']);
    $dishB = dishOf($b, ['name' => 'Calulu']);

    $response = $this->getJson('/api/v1/menu-items')->assertOk()->assertJsonCount(2, 'data');

    $byId = collect($response->json('data'))->keyBy('id');
    expect($byId[$dishA->uuid]['restaurantId'])->toBe($a->uuid)
        ->and($byId[$dishB->uuid]['restaurantId'])->toBe($b->uuid)
        ->and($byId[$dishA->uuid])->toHaveKey('ingredients');
});

test('catálogo deixa de fora restaurantes inativos (suspensos) e de demonstração', function () {
    $active = Restaurant::factory()->create();
    $suspended = Restaurant::factory()->create();
    $demo = Restaurant::factory()->create();
    $demo->forceFill(['is_demo' => true])->save();
    suspend($suspended);
    $visible = dishOf($active);
    dishOf($suspended);
    dishOf($demo);

    $this->getJson('/api/v1/menu-items')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $visible->uuid);
});

test('catálogo traz mais de 30 pratos do mesmo restaurante (a listagem por restaurante pagina)', function () {
    $restaurant = Restaurant::factory()->create();
    $menu = RestaurantMenu::factory()->create(['restaurant_id' => $restaurant->id]);
    MenuItem::factory()->count(35)->create(['restaurant_id' => $restaurant->id, 'menu_id' => $menu->id]);

    $this->getJson('/api/v1/menu-items')->assertOk()->assertJsonCount(35, 'data');
});

test('orderCount conta só pedidos dos últimos 30 dias que não foram recusados nem cancelados', function () {
    $dish = dishOf(Restaurant::factory()->create());
    orderWith($dish, 'delivered');
    orderWith($dish, 'pending');
    orderWith($dish, 'canceled');
    orderWith($dish, 'rejected');
    orderWith($dish, 'delivered', now()->subDays(45));

    $this->getJson('/api/v1/menu-items')->assertOk()->assertJsonPath('data.0.orderCount', 2);
});

test('editar um prato atualiza logo o catálogo (cache invalidada)', function () {
    $restaurant = Restaurant::factory()->create();
    $dish = dishOf($restaurant, ['name' => 'Nome antigo']);
    $this->getJson('/api/v1/menu-items')->assertJsonPath('data.0.name', 'Nome antigo');

    $this->actingAs(ownerOf($restaurant), 'sanctum')
        ->patchJson("/api/v1/menu-items/{$dish->uuid}", ['name' => 'Nome novo'])
        ->assertOk();

    $this->getJson('/api/v1/menu-items')->assertJsonPath('data.0.name', 'Nome novo');
});

test('listagem de restaurantes traz pedidos recentes e seguidores para ordenar por popularidade', function () {
    $restaurant = Restaurant::factory()->create();
    $dish = dishOf($restaurant);
    orderWith($dish, 'delivered');
    orderWith($dish, 'accepted');
    orderWith($dish, 'canceled');
    $restaurant->followers()->attach(User::factory()->count(2)->create());

    $this->getJson('/api/v1/restaurants')
        ->assertOk()
        ->assertJsonPath('data.0.recentOrdersCount', 2)
        ->assertJsonPath('data.0.followersCount', 2);
});

test('pacotes de um tipo deixam de fora restaurantes inativos', function () {
    $type = PackageType::factory()->create();
    $active = Restaurant::factory()->create();
    $suspended = Restaurant::factory()->create();
    suspend($suspended);
    $visible = RestaurantPackage::factory()->for($active)->create(['package_type_id' => $type->id, 'is_active' => true]);
    RestaurantPackage::factory()->for($suspended)->create(['package_type_id' => $type->id, 'is_active' => true]);

    $this->getJson("/api/v1/package-types/{$type->uuid}/restaurants")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $visible->uuid);
});
