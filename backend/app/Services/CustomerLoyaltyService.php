<?php

namespace App\Services;

use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Estatuto do cliente num restaurante, só pelo que gastou lá:
 * - Gold: GOLD_MIN_SPEND Kz ou mais;
 * - Platina: acima de PLATINUM_ABOVE_SPEND Kz.
 * Espelhado no front em @/lib/loyalty (modo demo).
 *
 * - Gasto = total dos pedidos cumpridos (entregues/concluídos, pratos +
 *   taxas) + cauções pagas das reservas. Pedidos recusados/cancelados e
 *   cauções reembolsadas não contam.
 * - É por restaurante: Gold aqui não é Gold noutro.
 * - Mesmo cliente = mesma conta; sem conta, o mesmo email (senão telefone),
 *   como a lista de clientes do painel já agrupa.
 */
class CustomerLoyaltyService
{
    public const GOLD_MIN_SPEND = 500000;

    /** "Acima de 1.000.000" = estritamente mais do que isto. */
    public const PLATINUM_ABOVE_SPEND = 1000000;

    private const HONORED_ORDER_STATUSES = ['delivered', 'completed'];

    /**
     * Todos os clientes do restaurante com o seu estatuto.
     *
     * @return Collection<int, array{key: string, email: ?string, phone: ?string, name: ?string, spend: float, tier: string}>
     */
    public function forRestaurant(Restaurant $restaurant): Collection
    {
        $rows = collect();

        foreach ($this->aggregates('orders', $restaurant->id, $this->orderSpend()) as $o) {
            $this->merge($rows, $o);
        }
        foreach ($this->aggregates('reservations', $restaurant->id, $this->reservationSpend()) as $r) {
            $this->merge($rows, $r);
        }

        return $rows->map(fn (array $row) => $row + ['tier' => $this->tier($row['spend'])])->values();
    }

    /**
     * Estatuto da própria conta em cada restaurante onde tem histórico.
     *
     * @return Collection<int, array{restaurantId: int, spend: float, tier: string}>
     */
    public function forUser(User $user): Collection
    {
        $byRestaurant = [];
        foreach (['orders' => $this->orderSpend(), 'reservations' => $this->reservationSpend()] as $table => $spendSql) {
            $rows = DB::table($table)
                ->where('user_id', $user->id)
                ->groupBy('restaurant_id')
                ->selectRaw("restaurant_id, {$spendSql} AS spend")
                ->get();
            foreach ($rows as $row) {
                $id = (int) $row->restaurant_id;
                $byRestaurant[$id] ??= ['restaurantId' => $id, 'spend' => 0.0];
                $byRestaurant[$id]['spend'] += (float) $row->spend;
            }
        }

        return collect($byRestaurant)
            ->map(fn (array $row) => $row + ['tier' => $this->tier($row['spend'])])
            ->values();
    }

    public function tier(float $spend): string
    {
        if ($spend > self::PLATINUM_ABOVE_SPEND) {
            return 'platinum';
        }

        return $spend >= self::GOLD_MIN_SPEND ? 'gold' : 'regular';
    }

    private function orderSpend(): string
    {
        $statuses = "'".implode("','", self::HONORED_ORDER_STATUSES)."'";

        return "COALESCE(SUM(total) FILTER (WHERE status IN ({$statuses})), 0)";
    }

    private function reservationSpend(): string
    {
        return "COALESCE(SUM(caution_amount) FILTER (WHERE caution_status = 'paid'), 0)";
    }

    private function aggregates(string $table, int $restaurantId, string $spendSql): Collection
    {
        $key = "COALESCE('user:' || {$table}.user_id::text, 'email:' || LOWER(NULLIF({$table}.customer_email, '')), 'phone:' || NULLIF({$table}.customer_phone, ''))";

        return DB::table($table)
            ->where('restaurant_id', $restaurantId)
            ->groupByRaw($key)
            ->selectRaw("{$key} AS ckey, MAX(customer_email) AS email, MAX(customer_phone) AS phone, MAX(customer_name) AS name, {$spendSql} AS spend")
            ->get();
    }

    private function merge(Collection $rows, object $source): void
    {
        if (! $source->ckey) {
            return;
        }
        $row = $rows->get($source->ckey) ?? [
            'key' => $source->ckey,
            'email' => $source->email ?: null,
            'phone' => $source->phone ?: null,
            'name' => $source->name ?: null,
            'spend' => 0.0,
        ];
        $row['spend'] += (float) $source->spend;
        $row['email'] ??= $source->email ?: null;
        $row['phone'] ??= $source->phone ?: null;
        $rows->put($source->ckey, $row);
    }
}
