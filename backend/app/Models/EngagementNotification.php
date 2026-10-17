<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Um lembrete/reconquista enviado — ver App\Services\Engagement\EngagementNotifier. */
class EngagementNotification extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'kind', 'ref', 'sent_at'];

    protected function casts(): array
    {
        return ['sent_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
