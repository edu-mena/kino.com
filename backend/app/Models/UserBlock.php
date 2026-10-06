<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Cliente `user_id` bloqueou `blocked_user_id` — ver UserBlockController. */
class UserBlock extends Model
{
    use HasPublicUuid;

    protected $fillable = ['user_id', 'blocked_user_id'];

    public function blocked(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blocked_user_id');
    }
}
