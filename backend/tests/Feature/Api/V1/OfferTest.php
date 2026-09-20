<?php

use App\Jobs\ProcessUploadedVideoJob;
use App\Models\Offer;
use App\Models\Restaurant;
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
