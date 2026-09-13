<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Singleton (id=1) — ver App\Services\DeliveryFeeCalculator. */
class DeliveryPolicy extends Model
{
    // 'id' fillable de propósito (bug real encontrado em testes, Fase 3):
    // sem isto, `updateOrCreate(['id' => 1], ...)`/`firstOrCreate` no
    // seeder ignora o id silenciosamente e deixa o auto-increment escolher
    // outro valor assim que a sequência do Postgres avançar (acontece até
    // com rollback de transação — sequences não são transacionais) —
    // `current()` passava a apontar para uma linha inexistente. Seguro
    // aqui: não há nenhum endpoint público que escreva neste model.
    protected $fillable = ['id', 'free_radius_km', 'per_km_surcharge_kz'];

    protected function casts(): array
    {
        return [
            'free_radius_km' => 'decimal:2',
            'per_km_surcharge_kz' => 'decimal:2',
        ];
    }

    public static function current(): self
    {
        return static::query()->findOrFail(1);
    }
}
