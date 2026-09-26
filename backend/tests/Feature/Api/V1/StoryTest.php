<?php

use App\Jobs\ProcessUploadedVideoJob;
use App\Models\Restaurant;
use App\Models\RestaurantStory;
use App\Models\RestaurantSubscription;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('r2', ['url' => 'https://cdn.luku.com']);
    Storage::fake('local');
});

test('staff cria story de imagem — síncrono, fica ready de imediato', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $file = UploadedFile::fake()->image('story.jpg', 720, 1280);

    $response = $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/stories", ['media' => $file]);

    $response->assertStatus(201)
        ->assertJsonPath('data.mediaType', 'image')
        ->assertJsonPath('data.processingStatus', 'ready');
    expect($response->json('data.mediaUrl'))->not->toBeEmpty();
});

test('story guarda e devolve legenda (text) e link opcionais', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $file = UploadedFile::fake()->image('story.jpg', 720, 1280);

    $response = $this->actingAs($owner, 'sanctum')->postJson(
        "/api/v1/restaurants/{$restaurant->uuid}/stories",
        ['media' => $file, 'text' => 'Só hoje!', 'link' => 'https://luku.ao/promo'],
    );

    $response->assertStatus(201)
        ->assertJsonPath('data.text', 'Só hoje!')
        ->assertJsonPath('data.link', 'https://luku.ao/promo');
});

test('staff envia vídeo de story — fica processing e despacha o job, não trava a resposta à espera do ffmpeg', function () {
    Bus::fake();
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $file = UploadedFile::fake()->create('story.mp4', 5000, 'video/mp4');

    $response = $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/stories", ['media' => $file]);

    $response->assertStatus(201)
        ->assertJsonPath('data.mediaType', 'video')
        ->assertJsonPath('data.processingStatus', 'processing');

    Bus::assertDispatched(ProcessUploadedVideoJob::class, function ($job) {
        return $job->mediaUrlField === 'media_url'
            && $job->thumbnailField === null
            && $job->publicPathPrefix === 'stories';
    });
});

test('story em processing NÃO aparece no feed público até ficar ready', function () {
    $restaurant = Restaurant::factory()->create();
    RestaurantStory::factory()->for($restaurant)->create(['processing_status' => 'processing', 'media_url' => '']);
    $ready = RestaurantStory::factory()->for($restaurant)->create(['processing_status' => 'ready']);

    $response = $this->getJson('/api/v1/stories');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $ready->uuid);
});

test('feed de um restaurante mistura as próprias stories com as institucionais Luku, não as de outro restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $mine = RestaurantStory::factory()->for($restaurant)->create();
    $global = RestaurantStory::factory()->create(['restaurant_id' => null]);
    RestaurantStory::factory()->for($otherRestaurant)->create(); // não deve aparecer

    $response = $this->getJson("/api/v1/restaurants/{$restaurant->uuid}/stories");

    $response->assertOk()->assertJsonCount(2, 'data');
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($mine->uuid, $global->uuid);
});

test('story com mais de 24h não aparece no feed (TTL real no servidor)', function () {
    $restaurant = Restaurant::factory()->create();
    $old = RestaurantStory::factory()->for($restaurant)->create();
    $old->forceFill(['created_at' => now()->subHours(30)])->save();
    $fresh = RestaurantStory::factory()->for($restaurant)->create();

    $response = $this->getJson('/api/v1/stories');

    $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $fresh->uuid);
});

test('só system_operator cria story institucional Luku (restaurant_id null)', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $file = UploadedFile::fake()->image('story.jpg');

    $this->actingAs($owner, 'sanctum')
        ->postJson('/api/v1/stories', ['media' => $file])
        ->assertForbidden();

    $operator = User::factory()->systemOperator()->create();
    $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/stories', ['media' => $file])
        ->assertStatus(201);
});

test('staff de outro restaurante não apaga story alheia', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $otherOwner = ownerOf($otherRestaurant);
    $story = RestaurantStory::factory()->for($restaurant)->create();

    $this->actingAs($otherOwner, 'sanctum')
        ->deleteJson("/api/v1/stories/{$story->uuid}")
        ->assertForbidden();
});

test('staff só apaga story institucional se for system_operator', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $global = RestaurantStory::factory()->create(['restaurant_id' => null]);

    $this->actingAs($owner, 'sanctum')
        ->deleteJson("/api/v1/stories/{$global->uuid}")
        ->assertForbidden();
});

test('restaurante Pro só cria 2 stories ativas por dia, a 3ª é bloqueada', function () {
    $restaurant = Restaurant::factory()->create();
    RestaurantSubscription::query()->create([
        'restaurant_id' => $restaurant->id, 'plan' => 'pro',
        'started_at' => now(), 'trial_ends_at' => now()->addDays(60), 'status' => 'active',
    ]);
    $owner = ownerOf($restaurant);
    RestaurantStory::factory()->for($restaurant)->count(2)->create();

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/stories", [
            'media' => UploadedFile::fake()->image('story.jpg'),
        ])
        ->assertStatus(403);
});

test('restaurante Plus não tem tecto de stories', function () {
    $restaurant = Restaurant::factory()->create();
    RestaurantSubscription::query()->create([
        'restaurant_id' => $restaurant->id, 'plan' => 'plus',
        'started_at' => now(), 'trial_ends_at' => now()->addDays(60), 'status' => 'active',
    ]);
    $owner = ownerOf($restaurant);
    RestaurantStory::factory()->for($restaurant)->count(5)->create();

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/stories", [
            'media' => UploadedFile::fake()->image('story.jpg'),
        ])
        ->assertStatus(201);
});
