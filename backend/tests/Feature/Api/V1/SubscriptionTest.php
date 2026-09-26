<?php

use App\Models\Restaurant;
use App\Models\RestaurantSubscription;
use App\Models\User;
use Carbon\Carbon;

function createSubscribedRestaurant(array $subAttrs = []): Restaurant
{
    $restaurant = Restaurant::factory()->create();
    RestaurantSubscription::query()->create(array_merge([
        'restaurant_id' => $restaurant->id,
        'plan' => 'plus',
        'started_at' => now()->subDays(10),
        'trial_ends_at' => now()->addDays(50),
        'status' => 'trial',
    ], $subAttrs));

    return $restaurant;
}

test('owner vê a própria subscrição; staff de outro restaurante não', function () {
    $restaurant = createSubscribedRestaurant();
    $owner = ownerOf($restaurant);
    $intruderRestaurant = Restaurant::factory()->create();
    $intruder = ownerOf($intruderRestaurant);

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/subscription")
        ->assertOk()->assertJsonPath('data.status', 'trial');

    $this->actingAs($intruder, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/subscription")
        ->assertForbidden();
});

test('só system_operator muda status/plano — owner não pode (billing é interno)', function () {
    $restaurant = createSubscribedRestaurant();
    $owner = ownerOf($restaurant);

    $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}/subscription", ['status' => 'active'])
        ->assertForbidden();

    $operator = User::factory()->systemOperator()->create();
    $this->actingAs($operator, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}/subscription", ['status' => 'suspended'])
        ->assertOk()->assertJsonPath('data.status', 'suspended')->assertJsonPath('data.locked', true);
});

test('só system_operator vê a lista agregada de subscrições (painel de sistema)', function () {
    $restaurantA = createSubscribedRestaurant(['status' => 'trial']);
    $restaurantB = createSubscribedRestaurant(['status' => 'active']);
    $owner = ownerOf($restaurantA);

    $this->actingAs($owner, 'sanctum')->getJson('/api/v1/subscriptions')->assertForbidden();

    $operator = User::factory()->systemOperator()->create();
    $this->actingAs($operator, 'sanctum')
        ->getJson('/api/v1/subscriptions')
        ->assertOk()->assertJsonCount(2, 'data');
});

test('registerPayment nunca desbloqueia uma suspensão sozinho', function () {
    $restaurant = createSubscribedRestaurant(['status' => 'suspended']);
    $operator = User::factory()->systemOperator()->create();

    $response = $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/subscription/register-payment");

    $response->assertOk()->assertJsonPath('data.status', 'suspended');
    expect($response->json('data.lastPaymentAt'))->not->toBeNull();
});

test('registerPayment em status overdue reativa para active', function () {
    $restaurant = createSubscribedRestaurant(['status' => 'overdue']);
    $operator = User::factory()->systemOperator()->create();

    $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/subscription/register-payment")
        ->assertOk()->assertJsonPath('data.status', 'active');
});

test('só aceita plan pro/plus — o plano único antigo já não é válido', function () {
    $restaurant = createSubscribedRestaurant();
    $operator = User::factory()->systemOperator()->create();

    $this->actingAs($operator, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}/subscription", ['plan' => 'luku'])
        ->assertStatus(422)->assertJsonValidationErrors('plan');

    $this->actingAs($operator, 'sanctum')
        ->patchJson("/api/v1/restaurants/{$restaurant->uuid}/subscription", ['plan' => 'pro'])
        ->assertOk()->assertJsonPath('data.plan', 'pro')->assertJsonPath('data.price', 9999);
});

test('subscrição expõe preço, tectos e uso do plano — Pro tem tecto, Plus não', function () {
    $restaurant = createSubscribedRestaurant(['plan' => 'pro']);
    $owner = ownerOf($restaurant);

    $response = $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/subscription");

    $response->assertOk()
        ->assertJsonPath('data.price', 9999)
        ->assertJsonPath('data.limits.stories', 2)
        ->assertJsonPath('data.limits.offers', 2)
        ->assertJsonPath('data.limits.reservationsPerMonth', 20)
        ->assertJsonPath('data.usage.stories', 0)
        ->assertJsonPath('data.features.packages', false)
        ->assertJsonPath('data.features.customers', false)
        ->assertJsonPath('data.features.stats', false);

    $plusRestaurant = createSubscribedRestaurant(['plan' => 'plus']);
    $plusOwner = ownerOf($plusRestaurant);

    $this->actingAs($plusOwner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$plusRestaurant->uuid}/subscription")
        ->assertOk()
        ->assertJsonPath('data.price', 12999)
        ->assertJsonPath('data.limits.stories', null)
        ->assertJsonPath('data.features.packages', true)
        ->assertJsonPath('data.features.customers', true)
        ->assertJsonPath('data.features.stats', true);
});

test('extendTrial soma a partir do maior entre agora e o trial_ends_at atual, força status=trial', function () {
    $restaurant = createSubscribedRestaurant(['status' => 'active', 'trial_ends_at' => now()->subDays(5)]);
    $operator = User::factory()->systemOperator()->create();

    $response = $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/subscription/extend-trial", ['days' => 10]);

    $response->assertOk()->assertJsonPath('data.status', 'trial');
    $newTrialEnds = Carbon::parse($response->json('data.trialEndsAt'));
    // Base foi "agora" (trial_ends_at já tinha passado), não o valor antigo.
    expect($newTrialEnds->diffInDays(now()->addDays(10)))->toBeLessThan(1);
});
