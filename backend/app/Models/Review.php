<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use App\Observers\ReviewObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[ObservedBy(ReviewObserver::class)]
class Review extends Model
{
    use HasFactory, HasPublicUuid;

    protected $fillable = [
        'restaurant_id', 'user_id', 'customer_name', 'rating', 'date',
        'comment', 'tags', 'ref_type', 'ref_id', 'reply_text', 'reply_at',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'tags' => 'array',
            'reply_at' => 'datetime',
        ];
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
