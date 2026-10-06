<?php

use App\Console\Commands\CreateStoreDemoRestaurant;
use App\Models\Restaurant;
use App\Models\RestaurantStory;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;

/*
 * Restaurante de demonstração para os revisores das lojas: escondido da
 * descoberta pública, encontrado só pelo nome exato.
 */

function runDemoCommand(array $options = []): array
{
    $code = Artisan::call('store:demo-restaurant', $options);
    preg_match('/senha:\s+(\S+)/', Artisan::output(), $m);

    return [$code, $m[1] ?? null];
}

function demoRestaurant(): Restaurant
{
    $restaurant = Restaurant::factory()->create(['name' => CreateStoreDemoRestaurant::NAME]);
    $restaurant->forceFill(['is_demo' => true])->save();

    return $restaurant;
}

test('o comando cria o restaurante escondido, aberto, com plano completo e a conta do revisor', function () {
    [$code, $password] = runDemoCommand();

    expect($code)->toBe(0)->and($password)->not->toBeNull();

    $restaurant = Restaurant::query()->firstWhere('name', CreateStoreDemoRestaurant::NAME);
    expect($restaurant->is_demo)->toBeTrue()
        ->and($restaurant->subscription->status)->toBe('active')
        ->and($restaurant->subscription->plan)->toBe('plus')
        ->and($restaurant->hours()->where('is_open', true)->count())->toBe(7)
        ->and($restaurant->menuItems()->count())->toBe(6);

    // A senha mostrada entra no painel, sem 2FA.
    $this->postJson('/api/v1/auth/login', ['email' => 'revisao@luku.ao', 'password' => $password])
        ->assertOk()
        ->assertJsonPath('data.user.restaurants.0.roleInRestaurant', 'owner')
        ->assertJsonStructure(['data' => ['token']]);
});

test('correr de novo não duplica nada e troca a senha', function () {
    [, $first] = runDemoCommand();
    [, $second] = runDemoCommand();

    expect(Restaurant::query()->where('is_demo', true)->count())->toBe(1)
        ->and(Restaurant::query()->firstWhere('is_demo', true)->menuItems()->count())->toBe(6)
        ->and($first)->not->toBe($second);

    $this->postJson('/api/v1/auth/login', ['email' => 'revisao@luku.ao', 'password' => $first])->assertUnauthorized();
});

test('recusa um email que já é de um cliente ou operador', function () {
    User::factory()->create(['email' => 'revisao@luku.ao']);

    [$code] = runDemoCommand();

    expect($code)->toBe(1)->and(Restaurant::query()->where('is_demo', true)->exists())->toBeFalse();
});

test('a listagem pública esconde o restaurante de demonstração', function () {
    Restaurant::factory()->create(['name' => 'Restaurante Real']);
    demoRestaurant();

    $this->getJson('/api/v1/restaurants')->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Restaurante Real');
});

test('pesquisar o nome exato encontra-o; pesquisa parcial não', function () {
    $demo = demoRestaurant();

    $this->getJson('/api/v1/restaurants?filter[search]=luku demo')->assertJsonPath('data.0.id', $demo->uuid);
    $this->getJson('/api/v1/restaurants?filter[search]=Luku')->assertJsonCount(0, 'data');
});

test('o link direto continua a abrir (o revisor e o próprio painel precisam dele)', function () {
    $demo = demoRestaurant();

    $this->getJson("/api/v1/restaurants/{$demo->uuid}")->assertOk();
});

test('stories e estatísticas do site não incluem o restaurante de demonstração', function () {
    $demo = demoRestaurant();
    $real = Restaurant::factory()->create();
    RestaurantStory::factory()->create(['restaurant_id' => $demo->id]);
    RestaurantStory::factory()->create(['restaurant_id' => $real->id]);

    $this->getJson('/api/v1/stories')->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/system/site-stats')->assertJsonPath('data.partnerRestaurants', 1);
});

test('a listagem pagina sem erros mesmo com restaurantes ainda sem avaliação (rating nulo)', function () {
    Restaurant::factory()->count(5)->create(['rating' => null]);

    $first = $this->getJson('/api/v1/restaurants?per_page=2')->assertOk();
    $seen = collect($first->json('data'))->pluck('id');
    $page = 2;
    while ($page <= $first->json('meta.last_page')) {
        $seen = $seen->merge($this->getJson("/api/v1/restaurants?per_page=2&page={$page}")->assertOk()->json('data.*.id'));
        $page++;
    }

    expect($seen->unique()->count())->toBe(5);
});
