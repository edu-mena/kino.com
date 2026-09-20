<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

/**
 * Gera automaticamente a coluna `uuid` pública (não a PK, que continua
 * BIGSERIAL para performance de índice/FK) — evita enumeração sequencial de
 * IDs de negócio por clientes externos. Usado por todo model exposto na API.
 */
trait HasPublicUuid
{
    public static function bootHasPublicUuid(): void
    {
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }
}
