<?php

use App\Jobs\ProcessUploadedVideoJob;
use App\Models\MenuItem;
use App\Models\Offer;
use App\Models\Restaurant;
use App\Models\RestaurantSubscription;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('r2', ['url' => 'https://cdn.luku.com']);
    Storage::fake('local');
});

test('staff cria oferta de desconto para o próprio restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/offers", [
        'type' => 'discount', 'title' => '15% no fim de semana', 'percent_off' => 15,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.type', 'discount')
        ->assertJsonPath('data.percentOff', 15)
        ->assertJsonPath('data.processingStatus', 'ready');
});

test('oferta tipo delivery não exige percent_off; discount exige', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/offers", ['type' => 'delivery', 'title' => 'Frete grátis'])
        ->assertStatus(201);

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/offers", ['type' => 'discount', 'title' => 'X'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('percent_off');
});

test('código promocional é normalizado para maiúsculas e é único mesmo com caixa diferente', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/offers", [
            'type' => 'discount', 'title' => 'A', 'percent_off' => 10, 'code' => 'luku10',
        ])->assertStatus(201)->assertJsonPath('data.code', 'LUKU10');

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/offers", [
            'type' => 'discount', 'title' => 'B', 'percent_off' => 20, 'code' => 'LUKU10',
        ])->assertStatus(422)->assertJsonValidationErrors('code');
});

test('oferta com vídeo fica processing e despacha o job com thumbnail_url', function () {
    Bus::fake();
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $file = UploadedFile::fake()->create('promo.mp4', 5000, 'video/mp4');

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/offers", [
        'type' => 'delivery', 'title' => 'Promo em vídeo', 'media' => $file,
    ]);

    $response->assertStatus(201)->assertJsonPath('data.processingStatus', 'processing');
    Bus::assertDispatched(ProcessUploadedVideoJob::class, fn ($job) => $job->mediaUrlField === 'image_url'
        && $job->thumbnailField === 'thumbnail_url'
        && $job->publicPathPrefix === 'promo');
});

test('só system_operator cria/apaga promoção global Luku', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->postJson('/api/v1/offers', ['type' => 'delivery', 'title' => 'Luku Frete'])
        ->assertForbidden();

    $operator = User::factory()->systemOperator()->create();
    $response = $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/offers', ['type' => 'delivery', 'title' => 'Luku Frete']);
    $response->assertStatus(201)->assertJsonPath('data.restaurantId', null);

    $offerUuid = $response->json('data.id');
    $this->actingAs($owner, 'sanctum')->deleteJson("/api/v1/offers/{$offerUuid}")->assertForbidden();
    $this->actingAs($operator, 'sanctum')->deleteJson("/api/v1/offers/{$offerUuid}")->assertStatus(204);
});

test('feed público só mostra ofertas ativas agora (dentro de starts_at/ends_at)', function () {
    $restaurant = Restaurant::factory()->create();
    $active = Offer::query()->create([
        'restaurant_id' => $restaurant->id, 'type' => 'delivery', 'title' => 'Ativa',
        'starts_at' => now()->subDay(), 'ends_at' => now()->addDay(),
    ]);
    Offer::query()->create([
        'restaurant_id' => $restaurant->id, 'type' => 'delivery', 'title' => 'Expirada',
        'starts_at' => now()->subDays(5), 'ends_at' => now()->subDay(),
    ]);
    Offer::query()->create([
        'restaurant_id' => $restaurant->id, 'type' => 'delivery', 'title' => 'Futura',
        'starts_at' => now()->addDay(),
    ]);

    $response = $this->getJson('/api/v1/offers');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $active->uuid);
});

test('staff de outro restaurante não edita/apaga oferta alheia', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $otherOwner = ownerOf($otherRestaurant);
    $offer = Offer::query()->create([
        'restaurant_id' => $restaurant->id, 'type' => 'delivery', 'title' => 'X', 'starts_at' => now(),
    ]);

    $this->actingAs($otherOwner, 'sanctum')
        ->postJson("/api/v1/offers/{$offer->uuid}", ['title' => 'Hackeado'])
        ->assertForbidden();
    $this->actingAs($otherOwner, 'sanctum')
        ->deleteJson("/api/v1/offers/{$offer->uuid}")
        ->assertForbidden();
});

test('atualizar imagem de uma oferta apaga a anterior do storage', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $first = UploadedFile::fake()->image('a.jpg');
    $second = UploadedFile::fake()->image('b.jpg');

    $created = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/offers", [
        'type' => 'delivery', 'title' => 'X', 'media' => $first,
    ]);
    $oldUrl = $created->json('data.imageUrl');
    $oldPath = str_replace('https://cdn.luku.com/', '', $oldUrl);
    Storage::disk('r2')->assertExists($oldPath);

    $offerUuid = $created->json('data.id');
    $this->actingAs($owner, 'sanctum')->postJson("/api/v1/offers/{$offerUuid}", ['media' => $second])->assertOk();

    Storage::disk('r2')->assertMissing($oldPath);
});

// --- promoção com pratos/categorias alvo (Fase K1) ---

test('staff cria promoção visando pratos específicos', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $dish = MenuItem::factory()->for($restaurant)->create();

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/offers", [
        'type' => 'discount', 'title' => '20% num prato', 'percent_off' => 20,
        'menu_item_ids' => [$dish->uuid],
    ]);

    $response->assertStatus(201)->assertJsonPath('data.targetMenuItemIds', [$dish->uuid]);
});

test('staff cria promoção visando categorias', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/offers", [
        'type' => 'discount', 'title' => '10% em sobremesas', 'percent_off' => 10,
        'categories' => ['Sobremesas'],
    ]);

    $response->assertStatus(201)->assertJsonPath('data.targetCategories', ['Sobremesas']);
});

test('não pode visar um prato de outro restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $foreignDish = MenuItem::factory()->for($otherRestaurant)->create();

    $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/offers", [
        'type' => 'discount', 'title' => 'X', 'percent_off' => 10,
        'menu_item_ids' => [$foreignDish->uuid],
    ])->assertStatus(422)->assertJsonValidationErrors('menu_item_ids.0');
});

test('menu_item_ids/categories chegam como JSON num campo só (multipart), não array repetido', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $dish = MenuItem::factory()->for($restaurant)->create();

    // Simula o que `buildFormData` (api-offers.ts) realmente envia — um
    // POST multipart com o campo como string JSON, não `postJson`.
    $response = $this->actingAs($owner, 'sanctum')->post("/api/v1/restaurants/{$restaurant->uuid}/offers", [
        'type' => 'discount', 'title' => 'X', 'percent_off' => 10,
        'menu_item_ids' => json_encode([$dish->uuid]),
        'categories' => json_encode(['Sobremesas']),
    ], ['Accept' => 'application/json']);

    $response->assertStatus(201)
        ->assertJsonPath('data.targetMenuItemIds', [$dish->uuid])
        ->assertJsonPath('data.targetCategories', ['Sobremesas']);
});

test('editar a promoção com seleção vazia limpa o alvo anterior', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $dish = MenuItem::factory()->for($restaurant)->create();
    $offer = Offer::query()->create([
        'restaurant_id' => $restaurant->id, 'type' => 'discount', 'title' => 'X', 'percent_off' => 10,
        'starts_at' => now(), 'target_menu_item_ids' => [$dish->uuid], 'target_categories' => ['Sobremesas'],
    ]);

    $response = $this->actingAs($owner, 'sanctum')->post("/api/v1/offers/{$offer->uuid}", [
        'menu_item_ids' => json_encode([]),
        'categories' => json_encode([]),
    ], ['Accept' => 'application/json']);

    $response->assertOk()
        ->assertJsonPath('data.targetMenuItemIds', [])
        ->assertJsonPath('data.targetCategories', []);
});

test('promoção global Luku não pode visar pratos/categorias', function () {
    $operator = User::factory()->systemOperator()->create();
    $restaurant = Restaurant::factory()->create();
    $dish = MenuItem::factory()->for($restaurant)->create();

    $this->actingAs($operator, 'sanctum')->postJson('/api/v1/offers', [
        'type' => 'discount', 'title' => 'Luku 10%', 'percent_off' => 10,
        'menu_item_ids' => [$dish->uuid],
    ])->assertStatus(422)->assertJsonValidationErrors('menu_item_ids');
});

test('restaurante Pro só cria 2 promoções ativas, a 3ª é bloqueada', function () {
    $restaurant = Restaurant::factory()->create();
    RestaurantSubscription::query()->create([
        'restaurant_id' => $restaurant->id, 'plan' => 'pro',
        'started_at' => now(), 'trial_ends_at' => now()->addDays(60), 'status' => 'active',
    ]);
    $owner = ownerOf($restaurant);
    for ($i = 0; $i < 2; $i++) {
        Offer::query()->create([
            'restaurant_id' => $restaurant->id, 'type' => 'delivery', 'title' => "Ativa {$i}",
            'starts_at' => now()->subDay(),
        ]);
    }

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/offers", [
            'type' => 'delivery', 'title' => 'Frete grátis',
        ])
        ->assertStatus(403);
});

test('restaurante Plus não tem tecto de promoções', function () {
    $restaurant = Restaurant::factory()->create();
    RestaurantSubscription::query()->create([
        'restaurant_id' => $restaurant->id, 'plan' => 'plus',
        'started_at' => now(), 'trial_ends_at' => now()->addDays(60), 'status' => 'active',
    ]);
    $owner = ownerOf($restaurant);
    for ($i = 0; $i < 5; $i++) {
        Offer::query()->create([
            'restaurant_id' => $restaurant->id, 'type' => 'delivery', 'title' => "Ativa {$i}",
            'starts_at' => now()->subDay(),
        ]);
    }

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/offers", [
            'type' => 'delivery', 'title' => 'Frete grátis',
        ])
        ->assertStatus(201);
});
