<?php

namespace App\Models;

use App\Models\Concerns\HasPublicUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Mesas juntas num dia (ex.: 3 + 4 para um grupo de 10 no sábado). Vale só
 * para `date` — a sala volta ao normal no dia seguinte sem ninguém mexer.
 * A primeira mesa (`position` 0) é a "âncora": uma reserva atribuída à
 * junção fica gravada nela, e ocupa a junção inteira nesse dia (ver
 * ReservationOccupancyService::unitMap).
 */
class TableCombination extends Model
{
    use HasPublicUuid;

    protected $fillable = ['restaurant_id', 'date', 'seats', 'label'];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'seats' => 'integer',
        ];
    }

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function tables(): BelongsToMany
    {
        return $this->belongsToMany(RestaurantTable::class, 'table_combination_table')
            ->withPivot(['date', 'position'])
            ->orderByPivot('position');
    }

    /** Substitui as mesas da junção, mantendo a ordem dada (a 1.ª é a
     * âncora). `date` vai também para a pivot — é o que dá a garantia de
     * "uma junção por mesa por dia" na própria BD. */
    public function syncTables(array $tableIds): void
    {
        $date = $this->date->toDateString();
        $payload = [];
        foreach (array_values($tableIds) as $position => $id) {
            $payload[$id] = ['date' => $date, 'position' => $position];
        }
        $this->tables()->sync($payload);
    }
}
