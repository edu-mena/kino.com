<?php

namespace Database\Factories;

use App\Models\Restaurant;
use App\Models\SupportTicket;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<SupportTicket> */
class SupportTicketFactory extends Factory
{
    public function definition(): array
    {
        return [
            'restaurant_id' => Restaurant::factory(),
            'subject' => fake()->sentence(4),
            'message' => fake()->paragraph(),
            'status' => 'open',
        ];
    }
}
