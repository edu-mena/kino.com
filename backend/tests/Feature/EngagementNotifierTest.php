<?php

use App\Models\EngagementNotification;
use App\Models\Restaurant;
use App\Models\Review;
use App\Models\User;
use App\Services\Engagement\EngagementNotifier;
use App\Services\PushNotificationService;
use Carbon\CarbonImmutable;

/*
 * Lembretes "à Duolingo" — ver EngagementNotifier. Horas em UTC; Luanda é
 * UTC+1.
 */

beforeEach(function () {
    $this->pushes = [];
    $push = Mockery::mock(PushNotificationService::class);
    $push->shouldReceive('sendMessage')->andReturnUsing(function (User $user, string $title, string $body, string $url) {
        $this->pushes[] = ['user' => $user->id, 'title' => $title, 'body' => $body, 'url' => $url];
    });
    $push->shouldReceive('sendForNotification');
    app()->instance(PushNotificationService::class, $push);

    $this->restaurant = Restaurant::factory()->create(['name' => 'Severina']);
});

function customerWithPush(): User
{
    $user = User::factory()->create(['role' => 'customer']);
    $user->deviceTokens()->create(['platform' => 'android', 'token' => 'fcm-'.$user->id]);

    return $user;
}

function finishedOrder(Restaurant $restaurant, User $user, string $at, string $dish = 'Muamba de Galinha')
{
    $order = $restaurant->orders()->create([
        'user_id' => $user->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $user->name, 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'completed', 'subtotal' => 1000, 'total' => 1000,
    ]);
    $order->lines()->create(['item_name_snapshot' => $dish, 'unit_price_snapshot' => 1000, 'qty' => 2, 'line_total' => 2000]);
    $order->forceFill(['created_at' => $at, 'updated_at' => $at])->saveQuietly();

    return $order;
}

function notifier(): EngagementNotifier
{
    return app(EngagementNotifier::class);
}

test('sugestão de almoço com o restaurante e o prato de sempre — uma vez por dia', function () {
    $user = customerWithPush();
    finishedOrder($this->restaurant, $user, '2026-10-10 12:00:00');

    $now = CarbonImmutable::parse('2026-10-17 10:30:00');
    expect(notifier()->sendMealSuggestions('lunch', $now))->toBe(1)
        ->and(notifier()->sendMealSuggestions('lunch', $now))->toBe(0);

    expect($this->pushes[0]['url'])->toBe("/restaurantes/{$this->restaurant->uuid}")
        ->and($this->pushes[0]['title'].$this->pushes[0]['body'])->toContain('Severina')
        ->and($this->pushes[0]['body'])->toContain('Muamba de Galinha');
});

test('quem já pediu hoje, quem desligou os lembretes ou não tem push não recebe sugestão', function () {
    $orderedToday = customerWithPush();
    finishedOrder($this->restaurant, $orderedToday, '2026-10-10 12:00:00');
    finishedOrder($this->restaurant, $orderedToday, '2026-10-17 08:00:00');

    $optedOut = customerWithPush();
    finishedOrder($this->restaurant, $optedOut, '2026-10-10 12:00:00');
    $optedOut->preferences()->create(['engagement_notifications' => false]);

    $noPush = User::factory()->create(['role' => 'customer']);
    finishedOrder($this->restaurant, $noPush, '2026-10-10 12:00:00');

    expect(notifier()->sendMealSuggestions('lunch', CarbonImmutable::parse('2026-10-17 10:30:00')))->toBe(0);
});

test('máximo de 1 lembrete de marketing por dia e 3 por semana, e nunca de noite', function () {
    $user = customerWithPush();
    finishedOrder($this->restaurant, $user, '2026-10-01 12:00:00');

    // De noite (22:00 em Luanda): nada.
    expect(notifier()->sendMealSuggestions('dinner', CarbonImmutable::parse('2026-10-17 21:00:00')))->toBe(0);

    // Almoço enviado → o jantar do mesmo dia já não sai.
    expect(notifier()->sendMealSuggestions('lunch', CarbonImmutable::parse('2026-10-13 10:30:00')))->toBe(1)
        ->and(notifier()->sendMealSuggestions('dinner', CarbonImmutable::parse('2026-10-13 17:30:00')))->toBe(0);

    notifier()->sendMealSuggestions('lunch', CarbonImmutable::parse('2026-10-14 10:30:00'));
    notifier()->sendMealSuggestions('lunch', CarbonImmutable::parse('2026-10-15 10:30:00'));
    // 4.º dia na mesma semana: já atingiu os 3.
    expect(notifier()->sendMealSuggestions('lunch', CarbonImmutable::parse('2026-10-16 10:30:00')))->toBe(0)
        ->and(EngagementNotification::count())->toBe(3);
});

test('lembrete de reserva ~2h antes, uma só vez, mesmo com o limite de marketing atingido', function () {
    $user = customerWithPush();
    EngagementNotification::create(['user_id' => $user->id, 'kind' => 'win_back', 'ref' => 'x', 'sent_at' => '2026-10-17 09:00:00']);

    $this->restaurant->reservations()->create([
        'user_id' => $user->id, 'customer_name' => 'Ana', 'customer_phone' => '900',
        'date' => '2026-10-17', 'time' => '20:00', 'people_count' => 2, 'status' => 'confirmed',
    ]);

    // 18:00 em Luanda (17:00 UTC) → reserva às 20:00 está na janela.
    $now = CarbonImmutable::parse('2026-10-17 17:00:00');
    expect(notifier()->sendReservationReminders($now))->toBe(1)
        ->and(notifier()->sendReservationReminders($now->addMinutes(15)))->toBe(0)
        ->and($this->pushes[0]['body'])->toContain('às 20:00')
        ->and($this->pushes[0]['url'])->toBe('/reservas');
});

test('pedido de avaliação 2-6h depois do pedido concluído, só se ainda não avaliou', function () {
    $user = customerWithPush();
    finishedOrder($this->restaurant, $user, '2026-10-17 09:00:00');

    $reviewer = customerWithPush();
    $reviewed = finishedOrder($this->restaurant, $reviewer, '2026-10-17 09:00:00');
    Review::create([
        'restaurant_id' => $this->restaurant->id, 'user_id' => $reviewer->id, 'customer_name' => 'B', 'rating' => 5,
        'date' => '2026-10-17', 'ref_type' => 'order', 'ref_id' => $reviewed->id,
    ]);

    expect(notifier()->sendReviewRequests(CarbonImmutable::parse('2026-10-17 10:00:00')))->toBe(0) // só 1h depois
        ->and(notifier()->sendReviewRequests(CarbonImmutable::parse('2026-10-17 12:00:00')))->toBe(1)
        ->and($this->pushes[0]['user'])->toBe($user->id);
});

test('reconquista por escalões: 7 dias, depois 14, sem repetir o mesmo escalão', function () {
    $user = customerWithPush();
    $user->forceFill(['created_at' => '2026-09-01 10:00:00', 'last_login_at' => '2026-10-01 10:00:00'])->saveQuietly();

    expect(notifier()->sendWinBack(CarbonImmutable::parse('2026-10-05 16:00:00')))->toBe(0) // 4 dias
        ->and(notifier()->sendWinBack(CarbonImmutable::parse('2026-10-09 16:00:00')))->toBe(1) // 8 dias
        ->and($this->pushes[0]['title'].$this->pushes[0]['body'])->toMatch('/semana/')
        ->and(notifier()->sendWinBack(CarbonImmutable::parse('2026-10-11 16:00:00')))->toBe(0) // mesmo escalão
        ->and(notifier()->sendWinBack(CarbonImmutable::parse('2026-10-16 16:00:00')))->toBe(1); // 15 dias

    expect(EngagementNotification::pluck('ref')->all())->toBe(['7d-2026-10-01', '14d-2026-10-01']);
});

test('preferência "Lembretes e novidades" pode ser desligada pela API', function () {
    $user = customerWithPush();

    $this->actingAs($user)->getJson('/api/v1/preferences')->assertJsonPath('data.engagementNotifications', true);
    $this->actingAs($user)->putJson('/api/v1/preferences', ['engagement_notifications' => false])
        ->assertSuccessful()
        ->assertJsonPath('data.engagementNotifications', false);
});
