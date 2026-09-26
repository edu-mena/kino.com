<?php

use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Facades\Config;

/**
 * `POST /api/v1/broadcasting/auth` — canal privado por restaurante (Fase N3,
 * `routes/channels.php`). O driver `null` usado nos testes (ver
 * `phpunit.xml`) nunca chama de facto o callback de autorização do canal —
 * troca-se aqui para `reverb` (chaves reais já em `.env`, ver
 * `config/broadcasting.php`) só para este ficheiro: autenticar um canal
 * privado é assinatura local (HMAC), não precisa de um servidor Reverb a
 * sério a correr.
 */
beforeEach(function () {
    // Trocar só o config não chega: `Broadcast::channel(...)` já correu no
    // boot (com o driver `null` de `phpunit.xml`) e ficou registado NESSA
    // instância — o driver `reverb` só é construído agora, com o array de
    // canais vazio. Recarregar o ficheiro depois de trocar o default faz
    // `Broadcast::channel(...)` correr de novo, desta vez contra o driver
    // certo.
    Config::set('broadcasting.default', 'reverb');
    require base_path('routes/channels.php');
});

function authRestaurantChannel(Restaurant $restaurant): string
{
    return "private-App.Models.Restaurant.{$restaurant->uuid}";
}

test('staff do restaurante autentica o canal privado do próprio restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->postJson('/api/v1/broadcasting/auth', [
            'channel_name' => authRestaurantChannel($restaurant),
            'socket_id' => '1234.5678',
        ])
        ->assertOk();
});

test('staff de outro restaurante NÃO autentica o canal privado alheio', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $otherOwner = ownerOf($otherRestaurant);

    $this->actingAs($otherOwner, 'sanctum')
        ->postJson('/api/v1/broadcasting/auth', [
            'channel_name' => authRestaurantChannel($restaurant),
            'socket_id' => '1234.5678',
        ])
        ->assertStatus(403);
});

test('system_operator autentica o canal privado de qualquer restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $operator = User::factory()->systemOperator()->create();

    $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/broadcasting/auth', [
            'channel_name' => authRestaurantChannel($restaurant),
            'socket_id' => '1234.5678',
        ])
        ->assertOk();
});

test('sem sessão (não autenticado) não autentica canal nenhum', function () {
    $restaurant = Restaurant::factory()->create();

    $this->postJson('/api/v1/broadcasting/auth', [
        'channel_name' => authRestaurantChannel($restaurant),
        'socket_id' => '1234.5678',
    ])->assertStatus(401);
});
