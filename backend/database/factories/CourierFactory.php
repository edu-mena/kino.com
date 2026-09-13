<?php

namespace Database\Factories;

use App\Models\Courier;
use App\Models\Restaurant;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Courier> */
class CourierFactory extends Factory
{
    public function definition(): array
    {
        return [
            'restaurant_id' => Restaurant::factory(),
            'name' => fake()->name(),
            'phone' => '+244 9'.fake()->numerify('## ### ###'),
            'vehicle' => fake()->randomElement(['moto', 'bicicleta', 'carro']),
            'zone' => 'Luanda',
            'status' => 'disponivel',
        ];
    }
}
