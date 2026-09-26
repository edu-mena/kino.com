<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SiteFaq extends Model
{
    use HasFactory, HasPublicUuid;

    protected $fillable = ['question', 'answer', 'position'];
}
