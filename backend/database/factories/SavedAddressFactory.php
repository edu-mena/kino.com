<?php

namespace Database\Factories;

use App\Models\SavedAddress;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<SavedAddress> */
class SavedAddressFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'label' => 'Casa',
            'line1' => fake()->streetAddress(),
            'is_default' => true,
            'lat' => fake()->latitude(-9, -8),
            'lng' => fake()->longitude(13, 14),
        ];
    }
}
