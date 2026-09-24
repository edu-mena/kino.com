<?php

namespace Database\Factories;

use App\Models\PackageType;
use App\Models\Restaurant;
use App\Models\RestaurantPackage;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<RestaurantPackage> */
class RestaurantPackageFactory extends Factory
{
    public function definition(): array
    {
        return [
            'restaurant_id' => Restaurant::factory(),
            'package_type_id' => PackageType::factory(),
            'title' => null,
            'description' => fake()->sentence(),
            'price' => fake()->numberBetween(10000, 80000),
            'max_people' => fake()->numberBetween(4, 30),
            'characteristics' => ['Bolo incluído', 'Decoração incluída'],
            'is_active' => true,
        ];
    }
}
