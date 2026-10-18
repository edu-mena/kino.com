<?php

use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantImport;
use App\Models\User;
use App\Services\SeededRestaurants\Catalog;

/*
 * Restaurantes gerados (`restaurants:seed-demo`) e a gestão em /sistema/gerados.
 */

function seedSourceRestaurant(string $cuisine, array $items): Restaurant
{
    $restaurant = Restaurant::factory()->create(['cuisine' => $cuisine, 'is_published' => false]);
    RestaurantImport::create(['restaurant_id' => $restaurant->id, 'source' => 'menus.ao', 'source_slug' => Str::slug($restaurant->name), 'source_url' => 'https://menus.ao/x', 'synced_at' => now()]);
    $menu = $restaurant->menus()->create(['name' => 'Menu', 'is_active' => true]);
    foreach ($items as [$name, $category, $price]) {
        MenuItem::create([
            'restaurant_id' => $restaurant->id, 'menu_id' => $menu->id, 'name' => $name, 'category' => $category, 'price' => $price,
            'image_url' => 'https://menus.ao/foto.jpg', 'is_available' => true,
        ]);
    }

    return $restaurant;
}

beforeEach(function () {
    foreach (['Angolana / Típica', 'Restaurante', 'Grelhados', 'Marisqueira', 'Italiana', 'Café / Pastelaria', 'Hambúrgueres', 'Brasileira', 'Bar / Lounge'] as $i => $cuisine) {
        seedSourceRestaurant($cuisine, [
            ["Prato A{$i}", 'PRATOS PRINCIPAIS', 5000],
            ["Prato B{$i}", 'Entradas', 2500],
            ["Sumo natural {$i}", 'Bebidas', 1200],
            ["Cerveja Cuca {$i}", 'Cervejas', 800],
            ["Whisky 12 anos {$i}", 'Destilados', 9000],
        ]);
    }
});

test('gera 50 restaurantes (30 em Luanda), visíveis, com serviços variados e cardápio sem álcool nem fotos', function () {
    $this->artisan('restaurants:seed-demo')->assertSuccessful();

    $seeded = Restaurant::query()->whereNotNull('seed_batch')->get();
    expect($seeded)->toHaveCount(50)
        ->and($seeded->where('city', 'Luanda'))->toHaveCount(30)
        ->and($seeded->pluck('city')->unique())->toHaveCount(11)
        ->and($seeded->every(fn ($r) => $r->is_published))->toBeTrue();

    // Visíveis na descoberta pública, como qualquer restaurante.
    expect(Restaurant::query()->listed()->visibleToCustomers()->whereNotNull('seed_batch')->count())->toBe(50);

    // Serviços diferentes: há quem só sirva no local e quem só entregue.
    $modes = $seeded->map(fn ($r) => implode(',', $r->fulfillment_modes))->unique();
    expect($modes)->toContain('dinein')->toContain('delivery')->toContain('delivery,takeaway,dinein');
    expect($seeded->firstWhere('name', 'Maré Alta Marisqueira')->is_delivery_available)->toBeFalse();

    $items = MenuItem::query()->whereIn('restaurant_id', $seeded->pluck('id'))->get();
    expect($items)->not->toBeEmpty()
        ->and($items->whereNotNull('image_url'))->toBeEmpty()
        ->and($items->filter(fn ($i) => str_contains($i->name, 'Cerveja') || str_contains($i->name, 'Whisky')))->toBeEmpty()
        ->and($items->pluck('category'))->toContain('Pratos principais');

    // Conta de acesso simples, só com acesso ao próprio restaurante.
    $owner = User::query()->where('email', 'tasca-do-mestre-ze@demo.luku.ao')->sole();
    expect(Hash::check('Luku2026!', $owner->password))->toBeTrue()
        ->and($owner->role)->toBe('restaurant_staff');
    $this->postJson('/api/v1/auth/login', ['email' => $owner->email, 'password' => 'Luku2026!'])->assertOk();

    // Correr de novo não duplica nada.
    $this->artisan('restaurants:seed-demo')->assertSuccessful();
    expect(Restaurant::query()->whereNotNull('seed_batch')->count())->toBe(count(Catalog::all()));
});

test('/sistema/gerados: desativar, reativar e apagar de vez — nunca toca restaurantes reais', function () {
    $this->artisan('restaurants:seed-demo')->assertSuccessful();
    $real = Restaurant::factory()->create(['is_published' => true]);
    $operator = User::factory()->create(['role' => 'system_operator']);
    $tasca = Restaurant::query()->where('name', 'Tasca do Mestre Zé')->sole();

    $this->actingAs(User::factory()->create())->getJson('/api/v1/system/seeded-restaurants')->assertForbidden();

    $this->actingAs($operator)->getJson('/api/v1/system/seeded-restaurants')
        ->assertOk()
        ->assertJsonCount(50, 'data')
        ->assertJsonPath('data.0.province', 'Luanda');

    // Desativar um: sai da descoberta, os dados ficam.
    $this->actingAs($operator)->postJson('/api/v1/system/seeded-restaurants/deactivate', ['ids' => [$tasca->uuid, $real->uuid]])
        ->assertOk()->assertJsonPath('data.updated', 1);
    expect($tasca->fresh()->is_published)->toBeFalse()
        ->and($real->fresh()->is_published)->toBeTrue();

    $this->actingAs($operator)->postJson('/api/v1/system/seeded-restaurants/activate', ['all' => true])->assertOk();
    expect($tasca->fresh()->is_published)->toBeTrue();

    // Apagar tudo: restaurantes, pratos e contas @demo.luku.ao desaparecem; o real fica.
    $this->actingAs($operator)->postJson('/api/v1/system/seeded-restaurants/delete', ['all' => true])
        ->assertOk()->assertJsonPath('data.deleted', 50);

    expect(Restaurant::withTrashed()->whereNotNull('seed_batch')->count())->toBe(0)
        ->and(MenuItem::query()->where('restaurant_id', $tasca->id)->count())->toBe(0)
        ->and(User::withTrashed()->where('email', 'like', '%@demo.luku.ao')->count())->toBe(0)
        ->and($real->fresh())->not->toBeNull();
});
