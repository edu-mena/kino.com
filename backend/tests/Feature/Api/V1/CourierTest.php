<?php

use App\Models\Courier;
use App\Models\Order;
use App\Models\Restaurant;

function createDeliveryOrder(Restaurant $restaurant, string $status = 'accepted'): Order
{
    return $restaurant->orders()->create([
        'fulfillment_type' => 'delivery', 'customer_name' => 'X', 'customer_phone' => '900',
        'status' => $status, 'subtotal' => 1000, 'total' => 1500,
    ]);
}

test('staff cria, lista e apaga estafetas do próprio restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/couriers", [
        'name' => 'Nzola Adão', 'phone' => '923118204', 'vehicle' => 'moto', 'zone' => 'Luanda',
    ]);
    $response->assertStatus(201)->assertJsonPath('data.status', 'disponivel');

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/couriers")
        ->assertOk()->assertJsonCount(1, 'data');

    $courierUuid = $response->json('data.id');
    $this->actingAs($owner, 'sanctum')->deleteJson("/api/v1/couriers/{$courierUuid}")->assertStatus(204);
});

test('staff de outro restaurante não gere estafetas alheios', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $otherOwner = ownerOf($otherRestaurant);
    $courier = Courier::factory()->for($restaurant)->create();

    $this->actingAs($otherOwner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/couriers")
        ->assertForbidden();

    $this->actingAs($otherOwner, 'sanctum')
        ->patchJson("/api/v1/couriers/{$courier->uuid}/status", ['status' => 'offline'])
        ->assertForbidden();
});

test('estafeta em_entrega não pode mudar de estado nem ser removido', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $order = createDeliveryOrder($restaurant);
    $courier = Courier::factory()->for($restaurant)->create(['status' => 'em_entrega', 'active_order_id' => $order->id]);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/couriers/{$courier->uuid}/status", ['status' => 'offline'])
        ->assertStatus(422);

    $this->actingAs($owner, 'sanctum')
        ->deleteJson("/api/v1/couriers/{$courier->uuid}")
        ->assertStatus(422);
});

// --- dispatch (accepted -> on_the_way + atribuição de estafeta) ---

test('despachar exige um estafeta disponível do MESMO restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $order = createDeliveryOrder($restaurant);
    $foreignCourier = Courier::factory()->for($otherRestaurant)->create();

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/orders/{$order->uuid}/dispatch", ['courier_id' => $foreignCourier->uuid])
        ->assertStatus(422)->assertJsonValidationErrors('courier_id');
});

test('não é possível despachar com um estafeta já em entrega', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $order = createDeliveryOrder($restaurant);
    $busyCourier = Courier::factory()->for($restaurant)->create(['status' => 'em_entrega']);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/orders/{$order->uuid}/dispatch", ['courier_id' => $busyCourier->uuid])
        ->assertStatus(422)->assertJsonValidationErrors('courier_id');
});

test('não é possível despachar um pedido takeaway/dinein nem um pedido ainda pending', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $courier = Courier::factory()->for($restaurant)->create();

    $pendingOrder = createDeliveryOrder($restaurant, 'pending');
    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/orders/{$pendingOrder->uuid}/dispatch", ['courier_id' => $courier->uuid])
        ->assertStatus(422);

    $takeawayOrder = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'accepted', 'subtotal' => 1000, 'total' => 1000,
    ]);
    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/orders/{$takeawayOrder->uuid}/dispatch", ['courier_id' => $courier->uuid])
        ->assertStatus(422);
});

test('despachar com sucesso atribui o estafeta e avança o pedido numa única ação', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $order = createDeliveryOrder($restaurant);
    $courier = Courier::factory()->for($restaurant)->create();

    $response = $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/orders/{$order->uuid}/dispatch", ['courier_id' => $courier->uuid]);

    $response->assertOk()->assertJsonPath('data.status', 'on_the_way');
    expect($courier->fresh())->status->toBe('em_entrega')->active_order_id->toBe($order->id);
});

test('recusar um pedido delivery liberta o estafeta que estava atribuído', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $order = createDeliveryOrder($restaurant);
    $courier = Courier::factory()->for($restaurant)->create();
    $this->actingAs($owner, 'sanctum')->patchJson("/api/v1/orders/{$order->uuid}/dispatch", ['courier_id' => $courier->uuid]);

    // "on_the_way" não pode ir para "rejected" na máquina de estados — mas
    // testamos a liberação via cancelamento indireto: simulamos que o
    // pedido é reatribuído/anulado diretamente no model (o Observer reage a
    // QUALQUER mudança de status para um estado terminal, não só via este
    // endpoint específico).
    $order->update(['status' => 'canceled']);

    expect($courier->fresh())->status->toBe('disponivel')->active_order_id->toBeNull();
});
