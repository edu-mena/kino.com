<?php

use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    // `url` tem de ir já no fake() — Storage::fake() cria o disco fake com a
    // config passada ali mesmo; um config() depois não o afeta (o disco já
    // foi resolvido/cacheado pelo FilesystemManager).
    Storage::fake('r2', ['url' => 'https://cdn.luku.com']);
    config(['filesystems.disks.r2.url' => 'https://cdn.luku.com']);
});

test('upload de imagem válida devolve um URL', function () {
    $user = User::factory()->create();
    $file = UploadedFile::fake()->image('prato.jpg', 800, 800)->size(500); // 500KB

    $response = $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/uploads', ['file' => $file, 'purpose' => 'dish']);

    $response->assertStatus(201)->assertJsonStructure(['data' => ['url', 'status']]);
    Storage::disk('r2')->assertExists(
        str_replace(Storage::disk('r2')->url(''), '', $response->json('data.url'))
    );
});

test('upload rejeita purpose inválido', function () {
    $user = User::factory()->create();
    $file = UploadedFile::fake()->image('x.jpg');

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/uploads', ['file' => $file, 'purpose' => 'banner-hacker'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('purpose');
});

test('upload rejeita ficheiro que não é imagem', function () {
    $user = User::factory()->create();
    $file = UploadedFile::fake()->create('curriculo.pdf', 200, 'application/pdf');

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/uploads', ['file' => $file, 'purpose' => 'dish'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('file');
});

test('galeria do restaurante guarda a imagem e devolve o id para remoção', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $file = UploadedFile::fake()->image('galeria.jpg');

    $response = $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/gallery", ['image' => $file]);

    $response->assertStatus(201);
    expect($restaurant->galleryImages()->count())->toBe(1);

    $imageId = $response->json('data.id');
    $this->actingAs($owner, 'sanctum')
        ->deleteJson("/api/v1/restaurants/{$restaurant->uuid}/gallery/{$imageId}")
        ->assertStatus(204);

    expect($restaurant->galleryImages()->count())->toBe(0);
});

test('não é possível apagar imagem de galeria de outro restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $image = $otherRestaurant->galleryImages()->create(['url' => 'https://cdn.luku.com/gallery/x.jpg', 'position' => 1]);
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->deleteJson("/api/v1/restaurants/{$restaurant->uuid}/gallery/{$image->id}")
        ->assertStatus(404);
});
