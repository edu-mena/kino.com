<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Catálogo estático seedado (ver database/seeders/PaymentMethodSeeder) — não
 * é dado do restaurante, nunca editável via API pública. PK é `code`. */
class PaymentMethod extends Model
{
    protected $primaryKey = 'code';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = ['code', 'name', 'is_digital', 'position'];

    protected function casts(): array
    {
        return ['is_digital' => 'boolean'];
    }
}
