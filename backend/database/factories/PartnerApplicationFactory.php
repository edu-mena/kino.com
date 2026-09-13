<?php

namespace Database\Factories;

use App\Models\PartnerApplication;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PartnerApplication> */
class PartnerApplicationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'restaurant_name' => fake()->company(),
            'owner_name' => fake()->name(),
            'phone' => '923'.fake()->numerify('######'),
            'email' => fake()->unique()->safeEmail(),
            'province' => fake()->randomElement(['Luanda', 'Benguela', 'Huíla']),
            'status' => 'pending',
        ];
    }
}
