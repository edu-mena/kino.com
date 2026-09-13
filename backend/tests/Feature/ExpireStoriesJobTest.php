<?php

use App\Jobs\ExpireStoriesJob;
use App\Models\Restaurant;
use App\Models\RestaurantStory;

test('apaga stories com mais de 24h, mantém as frescas', function () {
    $restaurant = Restaurant::factory()->create();
    $old = RestaurantStory::factory()->for($restaurant)->create();
    $old->forceFill(['created_at' => now()->subHours(25)])->save();
    $fresh = RestaurantStory::factory()->for($restaurant)->create();

    (new ExpireStoriesJob)->handle();

    expect(RestaurantStory::query()->find($fresh->id))->not->toBeNull();
    expect(RestaurantStory::withTrashed()->find($old->id)->trashed())->toBeTrue();
});
