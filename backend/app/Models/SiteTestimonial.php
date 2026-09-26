<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SiteTestimonial extends Model
{
    use HasFactory, HasPublicUuid;

    protected $fillable = ['name', 'role', 'quote', 'initials', 'photo_url', 'position'];
}
