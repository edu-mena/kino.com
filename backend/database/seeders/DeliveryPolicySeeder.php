<?php

namespace Database\Seeders;

use App\Models\DeliveryPolicy;
use Illuminate\Database\Seeder;

class DeliveryPolicySeeder extends Seeder
{
    public function run(): void
    {
        DeliveryPolicy::query()->updateOrCreate(
            ['id' => 1],
            ['free_radius_km' => 5, 'per_km_surcharge_kz' => 150],
        );
    }
}
