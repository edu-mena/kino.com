<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PackageType extends Model
{
    use HasFactory, HasPublicUuid;

    protected $fillable = ['name', 'description', 'icon', 'position', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function restaurantPackages(): HasMany
    {
        return $this->hasMany(RestaurantPackage::class);
    }
}
