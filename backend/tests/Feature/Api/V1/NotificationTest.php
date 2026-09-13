<?php

use App\Models\Notification;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Str;

test('criar um pedido gera notificação para o restaurante E para o cliente autenticado', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();

    $restaurant->orders()->create([
        'user_id' => $user->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $user->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);

    expect(Notification::where('restaurant_id', $restaurant->id)->where('event', 'orderNew')->exists())->toBeTrue();
    expect(Notification::where('user_id', $user->id)->where('event', 'orderNew')->exists())->toBeTrue();
});

test('pedido de convidado (sem user_id) só gera notificação para o restaurante', function () {
    $restaurant = Restaurant::factory()->create();

    $restaurant->orders()->create([
        'guest_token' => Str::uuid(), 'fulfillment_type' => 'takeaway',
        'customer_name' => 'Convidado', 'customer_phone' => '900', 'pickup_asap' => true,
        'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
    ]);

    expect(Notification::where('restaurant_id', $restaurant->id)->count())->toBe(1);
    expect(Notification::whereNotNull('user_id')->count())->toBe(0);
});

test('mudar o status de um pedido gera uma NOVA notificação orderStatus (não sobrescreve a orderNew)', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();
    $order = $restaurant->orders()->create([
        'user_id' => $user->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $user->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);

    $order->update(['status' => 'accepted']);

    expect(Notification::where('user_id', $user->id)->count())->toBe(2);
    expect(Notification::where('user_id', $user->id)->where('event', 'orderStatus')->exists())->toBeTrue();
});

test('atualizar um pedido sem mudar o status não gera notificação extra', function () {
    $restaurant = Restaurant::factory()->create();
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
        'guest_token' => Str::uuid(),
    ]);
    $countBefore = Notification::count();

    $order->update(['note' => 'sem cebola']);

    expect(Notification::count())->toBe($countBefore);
});

test('cliente só marca como lidas as próprias notificações; cross-user é 404', function () {
    $restaurant = Restaurant::factory()->create();
    $userA = User::factory()->create();
    $userB = User::factory()->create();
    $restaurant->orders()->create([
        'user_id' => $userA->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $userA->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);
    $notification = Notification::where('user_id', $userA->id)->firstOrFail();

    $this->actingAs($userB, 'sanctum')
        ->patchJson("/api/v1/notifications/{$notification->uuid}/read")
        ->assertStatus(404);

    $this->actingAs($userA, 'sanctum')
        ->patchJson("/api/v1/notifications/{$notification->uuid}/read")
        ->assertOk()->assertJsonPath('data.readAt', fn ($v) => $v !== null);
});

test('markManyRead só marca as que pertencem ao próprio user, ignora ids de outra conta', function () {
    $restaurant = Restaurant::factory()->create();
    $userA = User::factory()->create();
    $userB = User::factory()->create();
    $restaurant->orders()->create([
        'user_id' => $userA->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $userA->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);
    $restaurant->orders()->create([
        'user_id' => $userB->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $userB->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);
    $notifA = Notification::where('user_id', $userA->id)->firstOrFail();
    $notifB = Notification::where('user_id', $userB->id)->firstOrFail();

    $this->actingAs($userA, 'sanctum')
        ->postJson('/api/v1/notifications/read', ['ids' => [$notifA->uuid, $notifB->uuid]])
        ->assertOk()->assertJsonPath('data.updated', 1);

    expect($notifA->fresh()->read_at)->not->toBeNull();
    expect($notifB->fresh()->read_at)->toBeNull();
});

test('sino do restaurante só mostra as notificações do próprio restaurante, staff de outro não acede', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
        'guest_token' => Str::uuid(),
    ]);
    $owner = ownerOf($restaurant);
    $otherOwner = ownerOf($otherRestaurant);

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/notifications")
        ->assertOk()->assertJsonCount(1, 'data');

    $this->actingAs($otherOwner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/notifications")
        ->assertForbidden();
});
