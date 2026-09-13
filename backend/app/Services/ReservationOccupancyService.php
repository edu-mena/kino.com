<?php

namespace App\Services;

use App\Models\Reservation;
use App\Models\RestaurantTable;
use Illuminate\Support\Collection;

/**
 * Porte 1:1 de `src/lib/reservation-occupancy.ts` — decisão de produto
 * importante a preservar: reservas NÃO são bloqueadas/rejeitadas por
 * conflito na criação (não há "capacidade rígida" reservada por slot). O
 * restaurante aceita livremente e este serviço só sinaliza sobreposições
 * (mesa repetida ou lotação excedida) para o painel (`/admin/reservas`)
 * resolver manualmente — reatribuir mesa, recusar uma, etc. Isto é
 * deliberado, não uma lacuna: reimplementar como bloqueio rígido mudaria o
 * comportamento do produto, não só a tecnologia por trás.
 */
class ReservationOccupancyService
{
    private const OCCUPYING = ['pending', 'confirmed'];

    public function isOccupying(string $status): bool
    {
        return in_array($status, self::OCCUPYING, true);
    }

    private function timeToMin(string $time): int
    {
        [$h, $m] = array_map('intval', explode(':', substr($time, 0, 5)));

        return $h * 60 + $m;
    }

    public function overlaps(Reservation $a, Reservation $b, int $slotMin): bool
    {
        if ((string) $a->date !== (string) $b->date) {
            return false;
        }

        return abs($this->timeToMin($a->time) - $this->timeToMin($b->time)) < $slotMin;
    }

    /**
     * Ocupação da janela de `$reservation` (inclui-a) dentro de `$future`
     * (já filtrado para reservas que ocupam sala, data >= hoje).
     *
     * @param  Collection<int, Reservation>  $future
     * @return array{parties: int, seats: int, seatsOver: bool, partiesOver: bool, tableClash: bool, overbooked: bool}
     */
    public function windowOccupancy(
        Reservation $reservation,
        Collection $future,
        int $slotMin,
        int $totalSeats,
        int $tableCount,
    ): array {
        $inWindow = $future->filter(fn (Reservation $x) => $x->id === $reservation->id
            || $this->overlaps($reservation, $x, $slotMin));

        $seats = $inWindow->sum('people_count');
        $used = $inWindow->pluck('table_id')->filter()->values();
        $seatsOver = $totalSeats > 0 && $seats > $totalSeats;
        $partiesOver = $tableCount > 0 && $inWindow->count() > $tableCount;
        $tableClash = $used->unique()->count() !== $used->count();

        return [
            'parties' => $inWindow->count(),
            'seats' => $seats,
            'seatsOver' => $seatsOver,
            'partiesOver' => $partiesOver,
            'tableClash' => $tableClash,
            'overbooked' => $seatsOver || $partiesOver || $tableClash,
        ];
    }

    /**
     * Mesa livre mais pequena que caiba em `$reservation->people_count` na
     * janela dela — sugestão para o painel, nunca aplicada automaticamente.
     *
     * @param  Collection<int, Reservation>  $future
     * @param  Collection<int, RestaurantTable>  $tables
     */
    public function suggestTable(
        Reservation $reservation,
        Collection $future,
        Collection $tables,
        int $slotMin,
    ): ?int {
        $taken = $future
            ->filter(fn (Reservation $x) => $x->id !== $reservation->id
                && $x->table_id !== null
                && $this->overlaps($reservation, $x, $slotMin))
            ->pluck('table_id')
            ->all();

        return $tables
            ->filter(fn ($t) => ! in_array($t->id, $taken, true) && $t->seats >= $reservation->people_count)
            ->sortBy('seats')
            ->first()
            ?->id;
    }
}
