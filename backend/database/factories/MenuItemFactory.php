<?php

namespace Database\Factories;

use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<MenuItem> */
class MenuItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'restaurant_id' => Restaurant::factory(),
            'menu_id' => RestaurantMenu::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'price' => fake()->randomFloat(2, 500, 15000),
            'category' => 'Pratos principais',
            'is_available' => true,
        ];
    }
}
