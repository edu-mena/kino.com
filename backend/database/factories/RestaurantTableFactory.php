<?php

namespace Database\Factories;

use App\Models\Restaurant;
use App\Models\RestaurantTable;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<RestaurantTable> */
class RestaurantTableFactory extends Factory
{
    public function definition(): array
    {
        return [
            'restaurant_id' => Restaurant::factory(),
            'name' => 'Mesa '.fake()->unique()->numberBetween(1, 200),
            'seats' => fake()->numberBetween(2, 8),
            'area' => fake()->randomElement(['Interior', 'Esplanada']),
        ];
    }
}
