<?php

use App\Jobs\SendRestaurantDailyDigestsJob;
use App\Mail\RestaurantDailyDigestMail;
use App\Models\Restaurant;
use App\Models\RestaurantSubscription;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

function digestRestaurant(array $attrs = []): Restaurant
{
    return Restaurant::factory()->create(array_merge(['email' => 'dono@example.com'], $attrs));
}

test('restaurante com pedido ontem recebe o resumo diário', function () {
    Mail::fake();
    $restaurant = digestRestaurant();
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'delivered', 'subtotal' => 2000, 'total' => 2500,
        'guest_token' => (string) Str::uuid(),
    ]);
    // `created_at` não é fillable — passá-lo no create() acima é ignorado
    // em silêncio (fica com "agora"); forceFill()+save() contorna a
    // proteção de mass assignment, mesmo padrão já usado em StoryTest.php.
    $order->forceFill(['created_at' => now()->subDay()])->save();

    SendRestaurantDailyDigestsJob::dispatchSync();

    Mail::assertQueued(RestaurantDailyDigestMail::class, function (RestaurantDailyDigestMail $mail) use ($restaurant) {
        return $mail->restaurant->id === $restaurant->id
            && $mail->summary['ordersCount'] === 1
            && $mail->summary['ordersRevenue'] === 2500.0;
    });
});

test('restaurante sem atividade nenhuma ontem não recebe email', function () {
    Mail::fake();
    digestRestaurant();

    SendRestaurantDailyDigestsJob::dispatchSync();

    Mail::assertNothingQueued();
});

test('restaurante com subscrição suspensa não recebe resumo, mesmo com atividade', function () {
    Mail::fake();
    $restaurant = digestRestaurant();
    RestaurantSubscription::query()->create([
        'restaurant_id' => $restaurant->id, 'plan' => 'plus',
        'started_at' => now(), 'trial_ends_at' => now()->addDays(60), 'status' => 'suspended',
    ]);
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'Ana', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00',
        'people_count' => 2, 'status' => 'pending', 'status_updated_at' => now(),
    ]);
    $reservation->forceFill(['created_at' => now()->subDay()])->save();

    SendRestaurantDailyDigestsJob::dispatchSync();

    Mail::assertNothingQueued();
});

test('resumo conta reservas e avaliações de ontem, não só pedidos', function () {
    Mail::fake();
    $restaurant = digestRestaurant();
    $reservation = $restaurant->reservations()->create([
        'customer_name' => 'Ana', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:00',
        'people_count' => 4, 'status' => 'confirmed', 'status_updated_at' => now(),
    ]);
    $reservation->forceFill(['created_at' => now()->subDay()])->save();
    $review = $restaurant->reviews()->create([
        'customer_name' => 'Ana', 'rating' => 5, 'date' => now()->subDay(),
    ]);
    $review->forceFill(['created_at' => now()->subDay()])->save();

    SendRestaurantDailyDigestsJob::dispatchSync();

    Mail::assertQueued(RestaurantDailyDigestMail::class, function (RestaurantDailyDigestMail $mail) {
        return $mail->summary['reservationsCount'] === 1
            && $mail->summary['reservationsConfirmed'] === 1
            && $mail->summary['reviewsCount'] === 1
            && $mail->summary['reviewsAvgRating'] === 5.0;
    });
});
