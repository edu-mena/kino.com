<?php

use App\Models\Restaurant;

test('dono define o horário semanal e ele fica gravado — reproduz o fluxo de admin.perfil.tsx', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    // Mesmo shape que updateApiRestaurantHours (src/data/api-restaurants.ts)
    // envia: 7 dias, índice 0 = segunda, cada um com is_open + ranges.
    $days = collect(range(0, 6))->map(fn ($weekday) => [
        'weekday' => $weekday,
        'is_open' => $weekday !== 6, // fechado ao domingo, só para variar
        'ranges' => $weekday !== 6 ? [['start_time' => '11:00', 'end_time' => '23:00']] : [],
    ])->all();

    $response = $this->actingAs($owner, 'sanctum')
        ->putJson("/api/v1/restaurants/{$restaurant->uuid}/hours", ['days' => $days]);

    $response->assertOk();

    // Relê como o frontend releria (GET /restaurants/{id}, useRestaurantDetail)
    // — sem isto, um bug só na leitura (ex: whenLoaded sem eager-load)
    // passaria despercebido mesmo com o PUT a funcionar.
    $show = $this->getJson("/api/v1/restaurants/{$restaurant->uuid}")->assertOk();
    $hours = collect($show->json('data.hours'));

    expect($hours)->toHaveCount(7);
    $monday = $hours->firstWhere('weekday', 0);
    expect($monday['isOpen'])->toBeTrue();
    expect($monday['ranges'])->toHaveCount(1);
    expect($monday['ranges'][0]['start'])->toBe('11:00');
    expect($monday['ranges'][0]['end'])->toBe('23:00');

    $sunday = $hours->firstWhere('weekday', 6);
    expect($sunday['isOpen'])->toBeFalse();
});

test('re-gravar o horário substitui os intervalos antigos, não acumula', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $firstDays = collect(range(0, 6))->map(fn ($weekday) => [
        'weekday' => $weekday,
        'is_open' => true,
        'ranges' => [['start_time' => '08:00', 'end_time' => '12:00']],
    ])->all();
    $this->actingAs($owner, 'sanctum')
        ->putJson("/api/v1/restaurants/{$restaurant->uuid}/hours", ['days' => $firstDays])
        ->assertOk();

    $secondDays = collect(range(0, 6))->map(fn ($weekday) => [
        'weekday' => $weekday,
        'is_open' => true,
        'ranges' => [['start_time' => '18:00', 'end_time' => '22:00']],
    ])->all();
    $this->actingAs($owner, 'sanctum')
        ->putJson("/api/v1/restaurants/{$restaurant->uuid}/hours", ['days' => $secondDays])
        ->assertOk();

    $show = $this->getJson("/api/v1/restaurants/{$restaurant->uuid}")->assertOk();
    $monday = collect($show->json('data.hours'))->firstWhere('weekday', 0);

    expect($monday['ranges'])->toHaveCount(1);
    expect($monday['ranges'][0]['start'])->toBe('18:00');
});
