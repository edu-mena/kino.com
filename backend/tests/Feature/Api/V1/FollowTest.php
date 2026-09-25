<?php

use App\Jobs\NotifyFollowersOfPriceChangesJob;
use App\Models\MenuItem;
use App\Models\Notification;
use App\Models\Offer;
use App\Models\Restaurant;
use App\Models\RestaurantStory;
use App\Models\User;
use App\Services\FollowerBroadcaster;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;

test('cliente segue, lista e deixa de seguir um restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/follow")
        ->assertOk()
        ->assertJsonPath('data.following', true)
        ->assertJsonPath('data.notify', true)
        ->assertJsonPath('data.followersCount', 1);

    $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/follows')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.restaurant.id', $restaurant->uuid)
        ->assertJsonPath('data.0.notify', true);

    $this->actingAs($user, 'sanctum')
        ->deleteJson("/api/v1/restaurants/{$restaurant->uuid}/follow")
        ->assertOk()
        ->assertJsonPath('data.following', false)
        ->assertJsonPath('data.followersCount', 0);

    $this->actingAs($user, 'sanctum')->getJson('/api/v1/follows')->assertOk()->assertJsonCount(0, 'data');
});

test('seguir duas vezes não duplica', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/follow")->assertOk();
    $this->actingAs($user, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/follow")->assertOk();

    expect($user->followedRestaurants()->count())->toBe(1);
});

test('convidado não pode seguir', function () {
    $restaurant = Restaurant::factory()->create();

    $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/follow")->assertUnauthorized();
});

test('seguidos são só os do próprio user', function () {
    $restaurant = Restaurant::factory()->create();
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    $this->actingAs($userA, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/follow");

    $this->actingAs($userB, 'sanctum')->getJson('/api/v1/follows')->assertOk()->assertJsonCount(0, 'data');
});

test('detalhe do restaurante traz o número de seguidores', function () {
    $restaurant = Restaurant::factory()->create();
    $restaurant->followers()->attach(User::factory()->count(3)->create());

    $this->getJson("/api/v1/restaurants/{$restaurant->uuid}")
        ->assertOk()
        ->assertJsonPath('data.followersCount', 3);
});

test('desligar o sino só é possível para quem segue', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}/follow", ['notify' => false])
        ->assertNotFound();

    $this->actingAs($user, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/follow");
    $this->actingAs($user, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}/follow", ['notify' => false])
        ->assertOk()
        ->assertJsonPath('data.notify', false);
});

test('story novo avisa só os seguidores com o sino ligado', function () {
    $restaurant = Restaurant::factory()->create();
    $listening = User::factory()->create();
    $muted = User::factory()->create();
    $stranger = User::factory()->create();
    $restaurant->followers()->attach($listening->id, ['notify' => true]);
    $restaurant->followers()->attach($muted->id, ['notify' => false]);

    RestaurantStory::factory()->create(['restaurant_id' => $restaurant->id]);

    expect(Notification::query()->where('kind', 'restaurant')->pluck('user_id')->all())
        ->toBe([$listening->id]);

    $this->actingAs($listening, 'sanctum')
        ->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonPath('data.0.kind', 'restaurant')
        ->assertJsonPath('data.0.event', 'followStoryNew')
        ->assertJsonPath('data.0.refId', $restaurant->uuid)
        ->assertJsonPath('data.0.restaurantId', $restaurant->uuid);

    expect($stranger->notifications()->count())->toBe(0);
});

test('vídeo em processamento só avisa quando fica pronto, e só uma vez', function () {
    $restaurant = Restaurant::factory()->create();
    $follower = User::factory()->create();
    $restaurant->followers()->attach($follower->id);

    $story = RestaurantStory::factory()->create([
        'restaurant_id' => $restaurant->id,
        'media_type' => 'video',
        'processing_status' => 'processing',
    ]);
    expect($follower->notifications()->count())->toBe(0);

    $story->update(['processing_status' => 'ready']);
    expect($follower->notifications()->count())->toBe(1);

    // Reprocessar numa edição não volta a avisar.
    $story->update(['processing_status' => 'processing']);
    $story->update(['processing_status' => 'ready']);
    expect($follower->notifications()->count())->toBe(1);
});

test('promoção nova avisa os seguidores com o título', function () {
    $restaurant = Restaurant::factory()->create();
    $follower = User::factory()->create();
    $restaurant->followers()->attach($follower->id);

    Offer::query()->create([
        'restaurant_id' => $restaurant->id, 'type' => 'discount', 'title' => '20% no almoço',
        'starts_at' => now(),
    ]);

    $note = $follower->notifications()->first();
    expect($note->event)->toBe('followOfferNew')
        ->and($note->status_snapshot)->toBe('20% no almoço');
});

test('promoção global da Luku não avisa seguidores', function () {
    $restaurant = Restaurant::factory()->create();
    $follower = User::factory()->create();
    $restaurant->followers()->attach($follower->id);

    Offer::query()->create(['type' => 'discount', 'title' => 'Luku', 'starts_at' => now()]);

    expect($follower->notifications()->count())->toBe(0);
});

test('mudança de preço avisa; o nome ou a descrição não', function () {
    $restaurant = Restaurant::factory()->create();
    $follower = User::factory()->create();
    $restaurant->followers()->attach($follower->id);
    $item = MenuItem::factory()->create(['restaurant_id' => $restaurant->id, 'price' => 1000]);

    $item->update(['name' => 'Outro nome']);
    expect($follower->notifications()->count())->toBe(0);

    $item->update(['price' => 1500]);
    $note = $follower->notifications()->first();
    expect($note->event)->toBe('followPriceChange')
        ->and($note->status_snapshot)->toBe('1');
});

test('mudanças de preço dentro da janela saem numa só notificação', function () {
    $restaurant = Restaurant::factory()->create();
    $follower = User::factory()->create();
    $restaurant->followers()->attach($follower->id);
    $broadcaster = app(FollowerBroadcaster::class);

    // Fila síncrona nos testes: o job agendado corre logo na 1ª mudança,
    // por isso simula-se a janela chamando o serviço diretamente.
    Queue::fake();
    $broadcaster->priceChanged($restaurant->id);
    $broadcaster->priceChanged($restaurant->id);
    $broadcaster->priceChanged($restaurant->id);
    Queue::assertPushed(NotifyFollowersOfPriceChangesJob::class, 1);

    expect($broadcaster->pullPriceChanges($restaurant->id))->toBe(3)
        ->and($broadcaster->pullPriceChanges($restaurant->id))->toBe(0);
});

test('limite diário de avisos por restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $follower = User::factory()->create();
    $restaurant->followers()->attach($follower->id);

    for ($i = 0; $i < FollowerBroadcaster::DAILY_CAP + 3; $i++) {
        RestaurantStory::factory()->create(['restaurant_id' => $restaurant->id]);
    }

    expect($follower->notifications()->count())->toBe(FollowerBroadcaster::DAILY_CAP);
});

test('favoritos de restaurante antigos passam a seguidores na migração', function () {
    // A migração já correu (RefreshDatabase) — garante só que a tabela
    // antiga desapareceu e a nova existe.
    expect(Schema::hasTable('user_favorites'))->toBeFalse()
        ->and(Schema::hasTable('restaurant_follows'))->toBeTrue();
});
