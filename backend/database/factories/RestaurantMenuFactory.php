<?php

namespace Database\Factories;

use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<RestaurantMenu> */
class RestaurantMenuFactory extends Factory
{
    public function definition(): array
    {
        return [
            'restaurant_id' => Restaurant::factory(),
            'name' => 'Cardápio Principal',
            'is_active' => true,
        ];
    }
}
