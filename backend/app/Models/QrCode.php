<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Código curto de um QR impresso — `luku.ao/q/{code}`. `kind` =
 * `restaurant` (QR geral: montra, balcão, flyers) ou `table` (QR de uma
 * mesa: o pedido "no local" já sai com a mesa). Um código de mesa cuja mesa
 * foi apagada fica com `restaurant_table_id` nulo e continua a abrir o
 * cardápio do restaurante — um QR impresso nunca deve dar erro.
 */
class QrCode extends Model
{
    public const KIND_RESTAURANT = 'restaurant';

    public const KIND_TABLE = 'table';

    /** Sem 0/O, 1/I/L — legível se alguém tiver de o escrever à mão. */
    private const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

    private const LENGTH = 7;

    protected $fillable = ['code', 'restaurant_id', 'restaurant_table_id', 'kind', 'scans', 'last_scanned_at'];

    protected function casts(): array
    {
        return [
            'scans' => 'integer',
            'last_scanned_at' => 'datetime',
        ];
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(RestaurantTable::class, 'restaurant_table_id');
    }

    public static function generateUniqueCode(): string
    {
        $max = strlen(self::ALPHABET) - 1;
        do {
            $code = '';
            for ($i = 0; $i < self::LENGTH; $i++) {
                $code .= self::ALPHABET[random_int(0, $max)];
            }
        } while (self::query()->where('code', $code)->exists());

        return $code;
    }

    /** Normaliza o que vem no URL — aceita minúsculas (teclados, links
     * reescritos) e ignora o resto. */
    public static function normalize(string $code): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code) ?? '');
    }

    public static function forRestaurant(Restaurant $restaurant): self
    {
        return self::query()->firstOrCreate(
            ['restaurant_id' => $restaurant->id, 'kind' => self::KIND_RESTAURANT],
            ['code' => self::generateUniqueCode()],
        );
    }

    public static function forTable(RestaurantTable $table): self
    {
        return self::query()->firstOrCreate(
            ['restaurant_table_id' => $table->id],
            [
                'code' => self::generateUniqueCode(),
                'restaurant_id' => $table->restaurant_id,
                'kind' => self::KIND_TABLE,
            ],
        );
    }
}
