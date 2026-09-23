<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Company extends Model
{
    use HasFactory, HasPublicUuid;

    protected $fillable = ['user_id', 'name', 'nif', 'email'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
