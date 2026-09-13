<?php

namespace Database\Factories;

use App\Models\BlockedIp;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<BlockedIp> */
class BlockedIpFactory extends Factory
{
    public function definition(): array
    {
        return [
            'ip' => fake()->unique()->ipv4(),
            'reason' => 'manual:email_link',
            'blocked_at' => now(),
        ];
    }
}
