<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

/**
 * Papel único (`role`) para os 3 tipos de conta da plataforma — ver
 * decisão de schema no plano de backend: partilhar a mesma infraestrutura de
 * auth (Sanctum exige um Authenticatable único) evita duplicar login/token
 * em 3 tabelas. `customer` só autentica via Google; `restaurant_staff` e
 * `system_operator` só via password (nunca self-signup) — a regra é
 * aplicada em App\Http\Controllers\Api\V1\AuthController, não no schema.
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasPublicUuid, HasRoles, Notifiable, SoftDeletes;

    protected $fillable = [
        'role', 'name', 'email', 'phone', 'avatar_url',
        'google_id', 'password', 'email_verified_at', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function restaurantUsers(): HasMany
    {
        return $this->hasMany(RestaurantUser::class);
    }

    public function restaurants(): BelongsToMany
    {
        return $this->belongsToMany(Restaurant::class, 'restaurant_users')
            ->withPivot('role_in_restaurant')
            ->withTimestamps();
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function savedAddresses(): HasMany
    {
        return $this->hasMany(SavedAddress::class);
    }

    public function companies(): HasMany
    {
        return $this->hasMany(Company::class);
    }

    /** Restaurantes que o cliente segue — `notify` é o sino por
     * restaurante (ver migration restaurant_follows). */
    public function followedRestaurants(): BelongsToMany
    {
        return $this->belongsToMany(Restaurant::class, 'restaurant_follows')
            ->withPivot('notify')
            ->withTimestamps();
    }

    /** Pratos e bebidas favoritos (favoritos são só itens do cardápio —
     * restaurantes são seguidos, ver followedRestaurants). */
    public function favoriteMenuItems(): BelongsToMany
    {
        return $this->belongsToMany(MenuItem::class, 'menu_item_favorites')->withTimestamps();
    }

    public function preferences(): HasOne
    {
        return $this->hasOne(UserPreference::class);
    }

    public function deviceTokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class);
    }

    /**
     * Sobrepõe de propósito o `notifications()` do trait `Notifiable` — esse
     * aponta para a tabela polimórfica padrão do Laravel
     * (notifiable_type/notifiable_id/data), que NÃO é a nossa
     * `notifications` (schema próprio, ver App\Models\Notification e a
     * migration) — sem este override, `$user->notifications()` corria
     * contra colunas que não existem nesta tabela. `notify()`/emails
     * (ex: reset de senha) continuam a funcionar normalmente — não dependem
     * desta relação.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function isCustomer(): bool
    {
        return $this->role === 'customer';
    }

    public function isRestaurantStaff(): bool
    {
        return $this->role === 'restaurant_staff';
    }

    public function isSystemOperator(): bool
    {
        return $this->role === 'system_operator';
    }
}
