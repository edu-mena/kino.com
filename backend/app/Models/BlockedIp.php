<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BlockedIp extends Model
{
    use HasFactory;

    protected $fillable = ['ip', 'reason', 'blocked_at'];

    protected function casts(): array
    {
        return ['blocked_at' => 'datetime'];
    }
}
