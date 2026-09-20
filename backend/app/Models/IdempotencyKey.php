<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Ver App\Http\Middleware\EnsureIdempotency — registo de respostas para
 * POST orders/reservations, para retries de cliente não duplicarem. */
class IdempotencyKey extends Model
{
    protected $fillable = ['owner_key', 'idempotency_key', 'endpoint', 'response_status', 'response_body'];

    protected function casts(): array
    {
        return ['response_body' => 'array'];
    }
}
