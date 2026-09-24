<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Restaurant extends Model
{
    use HasFactory, HasPublicUuid, SoftDeletes;

    protected $fillable = [
        'name', 'description', 'cuisine', 'address', 'neighborhood', 'city',
        'lat', 'lng', 'phone', 'email', 'cover_image_url', 'wallpaper_url',
        'is_delivery_available', 'fulfillment_modes', 'accepted_payment_methods',
        'caution_modes_for_orders', 'delivery_zones', 'delivery_fee',
        'estimated_delivery_minutes', 'caution_amount', 'caution_policy_notice',
        'is_featured', 'accepts_reservations', 'reservation_slot_minutes',
        'reservation_cancellation_window_minutes',
        'orders_paused_manually',
    ];

    // rating/review_count ficam de fora de $fillable de propósito — nunca
    // graváveis via API, só por App\Observers\ReviewObserver (mass
    // assignment protection real).

    protected function casts(): array
    {
        return [
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
            'fulfillment_modes' => 'array',
            'accepted_payment_methods' => 'array',
            'caution_modes_for_orders' => 'array',
            'delivery_zones' => 'array',
            'is_delivery_available' => 'boolean',
            'is_featured' => 'boolean',
            'accepts_reservations' => 'boolean',
            'orders_paused_manually' => 'boolean',
            'delivery_fee' => 'decimal:2',
            'caution_amount' => 'decimal:2',
            'rating' => 'decimal:1',
        ];
    }

    public function staff(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'restaurant_users')
            ->withPivot('role_in_restaurant')
            ->withTimestamps();
    }

    public function hours(): HasMany
    {
        return $this->hasMany(RestaurantHour::class);
    }

    public function galleryImages(): HasMany
    {
        return $this->hasMany(RestaurantGalleryImage::class)->orderBy('position');
    }

    public function paymentDetails(): HasMany
    {
        return $this->hasMany(RestaurantPaymentDetail::class);
    }

    public function menus(): HasMany
    {
        return $this->hasMany(RestaurantMenu::class);
    }

    public function menuItems(): HasMany
    {
        return $this->hasMany(MenuItem::class);
    }

    public function tables(): HasMany
    {
        return $this->hasMany(RestaurantTable::class);
    }

    public function packages(): HasMany
    {
        return $this->hasMany(RestaurantPackage::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function offers(): HasMany
    {
        return $this->hasMany(Offer::class);
    }

    public function stories(): HasMany
    {
        return $this->hasMany(RestaurantStory::class);
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(RestaurantSubscription::class);
    }

    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class);
    }

    public function customerNotes(): HasMany
    {
        return $this->hasMany(CustomerNote::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function couriers(): HasMany
    {
        return $this->hasMany(Courier::class);
    }

    public function favoritedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_favorites');
    }
}
