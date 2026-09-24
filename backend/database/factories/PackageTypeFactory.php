<?php

namespace Database\Factories;

use App\Models\PackageType;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PackageType> */
class PackageTypeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'description' => fake()->sentence(),
            'icon' => 'party-popper',
            'position' => 0,
            'is_active' => true,
        ];
    }
}
