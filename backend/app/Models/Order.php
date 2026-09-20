<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use App\Observers\OrderObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

#[ObservedBy(OrderObserver::class)]
class Order extends Model
{
    use HasFactory, HasPublicUuid;

    protected $fillable = [
        'restaurant_id', 'user_id', 'guest_token', 'fulfillment_type',
        'customer_name', 'customer_phone', 'customer_email',
        'delivery_address_snapshot', 'pickup_asap', 'pickup_at', 'party_size',
        'status', 'estimated_minutes', 'delivered_at',
        'payment_method_code', 'caution_required', 'note',
        'promo_code', 'promo_label', 'promo_percent_off', 'promo_free_delivery',
        'payment_proof_url', 'payment_proof_at',
        'invoice_url', 'invoice_type', 'invoice_at',
        'subtotal', 'delivery_fee', 'total',
    ];

    protected function casts(): array
    {
        return [
            'delivery_address_snapshot' => 'array',
            'pickup_asap' => 'boolean',
            'pickup_at' => 'datetime',
            'delivered_at' => 'datetime',
            'caution_required' => 'decimal:2',
            'promo_free_delivery' => 'boolean',
            'payment_proof_at' => 'datetime',
            'invoice_at' => 'datetime',
            'subtotal' => 'decimal:2',
            'delivery_fee' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $order) {
            if (empty($order->user_id) && empty($order->guest_token)) {
                $order->guest_token = (string) Str::uuid();
            }
        });
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Estafeta a caminho com este pedido — inverso de
     * `Courier::activeOrder()` (FK vive lá, `active_order_id`). Só
     * preenchido enquanto `status === 'on_the_way'` (ver
     * OrderController::dispatch/updateStatus). */
    public function courier(): HasOne
    {
        return $this->hasOne(Courier::class, 'active_order_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(OrderLine::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_method_code', 'code');
    }
}
