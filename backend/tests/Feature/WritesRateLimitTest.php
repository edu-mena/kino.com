<?php

use App\Models\Restaurant;
use Illuminate\Support\Str;

/**
 * Regressão do bug real: um admin autenticado a gerir o próprio restaurante
 * (perfil/horário/menus/pedidos...) esgotava o mesmo teto de 20/min pensado
 * só pra bloquear bots no checkout anónimo — cada "Guardar" em
 * /admin/perfil sozinho já manda vários pedidos de escrita em sequência
 * (ver AppServiceProvider::boot, RateLimiter::for('writes')).
 */
test('utilizador autenticado passa dos 20/min sem ser bloqueado', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    // Endpoint leve e sem efeitos colaterais, mas dentro do grupo
    // throttle:writes (RestaurantController::showPaymentDetails) — serve só
    // pra bater no mesmo limiter repetidamente.
    for ($i = 0; $i < 25; $i++) {
        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/v1/restaurants/{$restaurant->uuid}/payment-details")
            ->assertOk();
    }
});

test('convidado (sem conta) continua limitado a 20/min no checkout — anti-spam intacto', function () {
    $restaurant = Restaurant::factory()->create();

    $makeReservation = fn () => $this->withHeaders(['Idempotency-Key' => (string) Str::uuid()])
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/reservations", [
            'customer_name' => 'Convidado Teste',
            'customer_phone' => '923000000',
            'date' => now()->addDay()->toDateString(),
            'time' => '19:00',
            'people_count' => 2,
        ]);

    for ($i = 0; $i < 20; $i++) {
        $makeReservation()->assertCreated();
    }

    $makeReservation()->assertStatus(429);
});
