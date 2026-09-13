<?php

namespace Database\Factories;

use App\Models\Restaurant;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Restaurant> */
class RestaurantFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'description' => fake()->sentence(),
            'cuisine' => fake()->randomElement(['Angolana', 'Portuguesa', 'Italiana', 'Fast-food']),
            'city' => 'Luanda',
            'neighborhood' => 'Luanda',
            'is_delivery_available' => true,
            'fulfillment_modes' => ['delivery', 'takeaway', 'dinein'],
            'accepted_payment_methods' => ['multicaixa_express', 'cash'],
            'caution_modes_for_orders' => [],
            'delivery_fee' => 500,
            'caution_amount' => 0,
        ];
    }
}
