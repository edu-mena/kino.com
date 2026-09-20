<?php

use App\Models\Order;
use App\Models\Restaurant;
use App\Models\Review;
use App\Models\User;

function createOrderReadyForReview(Restaurant $restaurant, User $user): Order
{
    return $restaurant->orders()->create([
        'user_id' => $user->id,
        'fulfillment_type' => 'takeaway',
        'customer_name' => $user->name,
        'customer_phone' => '900',
        'pickup_asap' => true,
        'status' => 'delivered',
        'subtotal' => 1000,
        'total' => 1000,
    ]);
}

test('avaliar exige autenticação', function () {
    $restaurant = Restaurant::factory()->create();

    $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/reviews", ['rating' => 5])
        ->assertUnauthorized();
});

test('avaliação sem ref é aceite e recalcula rating/review_count do restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/reviews", [
        'rating' => 4, 'comment' => 'Muito bom', 'tags' => ['Comida boa'],
    ])->assertStatus(201);

    expect($restaurant->fresh())->rating->toEqual(4.0)->review_count->toBe(1);
});

test('avaliação com ref de pedido próprio e entregue é aceite e guarda ref_type/ref_id', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();
    $order = createOrderReadyForReview($restaurant, $user);

    $response = $this->actingAs($user, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/reviews", [
        'rating' => 5, 'ref_type' => 'order', 'ref_id' => $order->uuid,
    ]);

    $response->assertStatus(201);
    expect(Review::first())->ref_type->toBe('order')->ref_id->toBe($order->id);
});

test('não é possível avaliar pedido de outro user (roubar avaliação)', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $order = createOrderReadyForReview($restaurant, $owner);

    $this->actingAs($intruder, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/reviews", [
            'rating' => 1, 'ref_type' => 'order', 'ref_id' => $order->uuid,
        ])
        ->assertStatus(422)->assertJsonValidationErrors('ref_id');
});

test('não é possível avaliar pedido ainda não entregue', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();
    $order = $restaurant->orders()->create([
        'user_id' => $user->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $user->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);

    $this->actingAs($user, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/reviews", [
            'rating' => 5, 'ref_type' => 'order', 'ref_id' => $order->uuid,
        ])
        ->assertStatus(422)->assertJsonValidationErrors('ref_id');
});

test('não é possível avaliar o mesmo pedido duas vezes', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();
    $order = createOrderReadyForReview($restaurant, $user);

    $this->actingAs($user, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/reviews", [
        'rating' => 5, 'ref_type' => 'order', 'ref_id' => $order->uuid,
    ])->assertStatus(201);

    $this->actingAs($user, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/reviews", [
        'rating' => 3, 'ref_type' => 'order', 'ref_id' => $order->uuid,
    ])->assertStatus(422)->assertJsonValidationErrors('ref_id');
});

test('só system_operator apaga review (moderação) — restaurante não pode censurar', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();
    $review = $restaurant->reviews()->create([
        'customer_name' => $user->name, 'user_id' => $user->id, 'rating' => 1,
        'date' => now()->toDateString(), 'comment' => 'Péssimo',
    ]);
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')->deleteJson("/api/v1/reviews/{$review->uuid}")->assertForbidden();

    $operator = User::factory()->systemOperator()->create();
    $this->actingAs($operator, 'sanctum')->deleteJson("/api/v1/reviews/{$review->uuid}")->assertStatus(204);
    expect($restaurant->fresh()->review_count)->toBe(0);
});

test('dono do restaurante responde a uma avaliação e a resposta aparece no recurso', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();
    $review = $restaurant->reviews()->create([
        'customer_name' => $user->name, 'user_id' => $user->id, 'rating' => 3,
        'date' => now()->toDateString(), 'comment' => 'Podia ser melhor',
    ]);
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->putJson("/api/v1/reviews/{$review->uuid}/reply", ['text' => 'Obrigado pelo feedback!'])
        ->assertOk()
        ->assertJsonPath('data.reply.text', 'Obrigado pelo feedback!');

    expect($review->fresh()->reply_at)->not->toBeNull();
});

test('enviar texto vazio apaga a resposta existente', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();
    $review = $restaurant->reviews()->create([
        'customer_name' => $user->name, 'user_id' => $user->id, 'rating' => 3,
        'date' => now()->toDateString(), 'reply_text' => 'Já respondida', 'reply_at' => now(),
    ]);
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->putJson("/api/v1/reviews/{$review->uuid}/reply", ['text' => null])
        ->assertOk()
        ->assertJsonPath('data.reply', null);

    expect($review->fresh())->reply_text->toBeNull()->reply_at->toBeNull();
});

test('staff de outro restaurante não consegue responder à avaliação', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $otherOwner = ownerOf($otherRestaurant);
    $review = $restaurant->reviews()->create([
        'customer_name' => 'X', 'rating' => 3, 'date' => now()->toDateString(),
    ]);

    $this->actingAs($otherOwner, 'sanctum')
        ->putJson("/api/v1/reviews/{$review->uuid}/reply", ['text' => 'Oi'])
        ->assertForbidden();
});
