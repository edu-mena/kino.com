<?php

namespace Database\Factories;

use App\Models\SystemSecurityEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<SystemSecurityEvent> */
class SystemSecurityEventFactory extends Factory
{
    public function definition(): array
    {
        return [
            'ip' => fake()->unique()->ipv4(),
            'user_agent' => fake()->userAgent(),
            'event' => 'page_view',
            'outcome' => null,
            'email_attempted' => null,
        ];
    }
}
