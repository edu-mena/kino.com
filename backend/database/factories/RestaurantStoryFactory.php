<?php

namespace Database\Factories;

use App\Models\Restaurant;
use App\Models\RestaurantStory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<RestaurantStory> */
class RestaurantStoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'restaurant_id' => Restaurant::factory(),
            'media_url' => 'https://cdn.luku.com/story/'.fake()->uuid().'.jpg',
            'media_type' => 'image',
            'processing_status' => 'ready',
        ];
    }
}
