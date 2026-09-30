<?php

use App\Jobs\SendPushNotificationJob;
use App\Models\DeliveryPolicy;
use App\Models\MenuItem;
use App\Models\Notification;
use App\Models\PaymentMethod;
use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;

/*
 * Quem faz uma ação não é notificado dela própria (item 14): a notificação
 * desse lado fica gravada — histórico — mas já lida e sem push. O outro lado
 * continua a ser avisado normalmente.
 */

beforeEach(function () {
    PaymentMethod::query()->firstOrCreate(['code' => 'cash'], ['name' => 'Numerário', 'is_digital' => false, 'position' => 1]);
    DeliveryPolicy::query()->firstOrCreate(['id' => 1], ['free_radius_km' => 5, 'per_km_surcharge_kz' => 150]);
    Queue::fake([SendPushNotificationJob::class]);
});

function selfActionRestaurant(): array
{
    $restaurant = Restaurant::factory()->create([
        'fulfillment_modes' => ['takeaway'],
        'accepted_payment_methods' => ['cash'],
        'caution_modes_for_orders' => [],
        'orders_paused_manually' => false,
    ]);
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 2000]);

    return [$restaurant, $item];
}

test('cliente que cria o pedido não é avisado do próprio pedido; o restaurante é', function () {
    [$restaurant, $item] = selfActionRestaurant();
    $owner = ownerOf($restaurant);
    $customer = User::factory()->create();

    $this->actingAs($customer, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/orders", [
        'fulfillment_type' => 'takeaway',
        'customer_name' => $customer->name,
        'customer_phone' => '923000000',
        'pickup_asap' => true,
        'items' => [['menu_item_id' => $item->uuid, 'qty' => 1]],
    ], ['Idempotency-Key' => Str::uuid()->toString()])->assertStatus(201);

    $mine = Notification::query()->where('user_id', $customer->id)->sole();
    $restaurantSide = Notification::query()->where('restaurant_id', $restaurant->id)->sole();

    expect($mine->read_at)->not->toBeNull()        // gravada, mas já lida
        ->and($restaurantSide->read_at)->toBeNull(); // o restaurante tem novidade

    Queue::assertPushed(SendPushNotificationJob::class, fn ($job) => $job->user->is($owner));
    Queue::assertNotPushed(SendPushNotificationJob::class, fn ($job) => $job->user->is($customer));
});

test('restaurante que aceita não é avisado da própria ação; o cliente é', function () {
    [$restaurant] = selfActionRestaurant();
    $owner = ownerOf($restaurant);
    $customer = User::factory()->create();
    $order = $restaurant->orders()->create([
        'user_id' => $customer->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $customer->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);
    Notification::query()->delete();
    Queue::fake([SendPushNotificationJob::class]); // só conta o que o accept despachar

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/orders/{$order->uuid}/accept", ['payment_method_code' => 'cash'])
        ->assertOk();

    expect(Notification::query()->where('restaurant_id', $restaurant->id)->sole()->read_at)->not->toBeNull()
        ->and(Notification::query()->where('user_id', $customer->id)->sole()->read_at)->toBeNull();

    Queue::assertPushed(SendPushNotificationJob::class, fn ($job) => $job->user->is($customer));
    Queue::assertNotPushed(SendPushNotificationJob::class, fn ($job) => $job->user->is($owner));
});

test('convidado que cancela conta como o lado do cliente: o restaurante é avisado', function () {
    [$restaurant] = selfActionRestaurant();
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'Ana', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
        'guest_token' => Str::uuid(),
    ]);
    Notification::query()->delete();

    $this->withHeader('X-Guest-Token', (string) $order->guest_token)
        ->postJson("/api/v1/orders/{$order->uuid}/cancel")
        ->assertOk();

    expect(Notification::query()->where('restaurant_id', $restaurant->id)->sole()->read_at)->toBeNull();
});

test('mudanças sem pedido HTTP (fila/agendador) avisam os dois lados', function () {
    [$restaurant] = selfActionRestaurant();
    $customer = User::factory()->create();
    $restaurant->orders()->create([
        'user_id' => $customer->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $customer->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);

    expect(Notification::query()->whereNull('read_at')->count())->toBe(2);
});
