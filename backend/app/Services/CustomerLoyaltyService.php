<?php

namespace App\Services;

use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Cliente Gold de um restaurante: mais de GOLD_MIN_VISITS reservas e
 * pedidos cumpridos, OU gasto total de GOLD_MIN_SPEND Kz ou mais.
 * Espelhado no front em @/lib/loyalty (modo demo).
 *
 * - Conta só o que foi cumprido: pedidos entregues/concluídos e reservas
 *   confirmadas cuja data já passou (faltas, recusas, cancelamentos e
 *   anulações ficam de fora).
 * - Gasto = total dos pedidos cumpridos (pratos + taxas) + cauções pagas
 *   das reservas (reembolsadas ficam de fora).
 * - É por restaurante: Gold aqui não é Gold noutro.
 * - Mesmo cliente = mesma conta; sem conta, o mesmo email (senão telefone),
 *   como a lista de clientes do painel já agrupa.
 */
class CustomerLoyaltyService
{
    /** "Mais de 25" = 26 ou mais. */
    public const GOLD_MIN_VISITS = 26;

    public const GOLD_MIN_SPEND = 500000;

    private const HONORED_ORDER_STATUSES = ['delivered', 'completed'];

    /**
     * Todos os clientes do restaurante com o seu estatuto.
     *
     * @return Collection<int, array{key: string, email: ?string, phone: ?string, name: ?string, honoredCount: int, spend: float, tier: string}>
     */
    public function forRestaurant(Restaurant $restaurant): Collection
    {
        $rows = collect();

        foreach ($this->orderAggregates($restaurant->id) as $o) {
            $this->merge($rows, $o->ckey, $o, (int) $o->honored, (float) $o->spend);
        }
        foreach ($this->reservationAggregates($restaurant->id) as $r) {
            $this->merge($rows, $r->ckey, $r, (int) $r->honored, (float) $r->spend);
        }

        return $rows->map(fn (array $row) => $row + ['tier' => $this->tier($row['honoredCount'], $row['spend'])])
            ->values();
    }

    /**
     * Estatuto da própria conta em cada restaurante onde tem histórico.
     *
     * @return Collection<int, array{restaurantId: int, honoredCount: int, spend: float, tier: string}>
     */
    public function forUser(User $user): Collection
    {
        $orders = DB::table('orders')
            ->where('user_id', $user->id)
            ->groupBy('restaurant_id')
            ->selectRaw('restaurant_id, '.$this->orderSums())
            ->get();
        $reservations = DB::table('reservations')
            ->where('user_id', $user->id)
            ->groupBy('restaurant_id')
            ->selectRaw('restaurant_id, '.$this->reservationSums(), [now()->toDateString()])
            ->get();

        $byRestaurant = [];
        foreach ([...$orders, ...$reservations] as $row) {
            $id = (int) $row->restaurant_id;
            $byRestaurant[$id] ??= ['restaurantId' => $id, 'honoredCount' => 0, 'spend' => 0.0];
            $byRestaurant[$id]['honoredCount'] += (int) $row->honored;
            $byRestaurant[$id]['spend'] += (float) $row->spend;
        }

        return collect($byRestaurant)
            ->map(fn (array $row) => $row + ['tier' => $this->tier($row['honoredCount'], $row['spend'])])
            ->values();
    }

    public function tier(int $honoredCount, float $spend): string
    {
        return $honoredCount >= self::GOLD_MIN_VISITS || $spend >= self::GOLD_MIN_SPEND ? 'gold' : 'regular';
    }

    private function customerKeySql(string $table): string
    {
        return "COALESCE('user:' || {$table}.user_id::text, 'email:' || LOWER(NULLIF({$table}.customer_email, '')), 'phone:' || NULLIF({$table}.customer_phone, ''))";
    }

    private function orderSums(): string
    {
        $statuses = "'".implode("','", self::HONORED_ORDER_STATUSES)."'";

        return "COUNT(*) FILTER (WHERE status IN ({$statuses})) AS honored, "
            ."COALESCE(SUM(total) FILTER (WHERE status IN ({$statuses})), 0) AS spend";
    }

    private function reservationSums(): string
    {
        return "COUNT(*) FILTER (WHERE status = 'confirmed' AND date <= ?) AS honored, "
            ."COALESCE(SUM(caution_amount) FILTER (WHERE caution_status = 'paid'), 0) AS spend";
    }

    private function orderAggregates(int $restaurantId): Collection
    {
        $key = $this->customerKeySql('orders');

        return DB::table('orders')
            ->where('restaurant_id', $restaurantId)
            ->groupByRaw($key)
            ->selectRaw("{$key} AS ckey, MAX(customer_email) AS email, MAX(customer_phone) AS phone, MAX(customer_name) AS name, ".$this->orderSums())
            ->get();
    }

    private function reservationAggregates(int $restaurantId): Collection
    {
        $key = $this->customerKeySql('reservations');

        return DB::table('reservations')
            ->where('restaurant_id', $restaurantId)
            ->groupByRaw($key)
            ->selectRaw(
                "{$key} AS ckey, MAX(customer_email) AS email, MAX(customer_phone) AS phone, MAX(customer_name) AS name, ".$this->reservationSums(),
                [now()->toDateString()],
            )
            ->get();
    }

    private function merge(Collection $rows, ?string $key, object $source, int $honored, float $spend): void
    {
        if (! $key) {
            return;
        }
        $row = $rows->get($key) ?? [
            'key' => $key,
            'email' => $source->email ?: null,
            'phone' => $source->phone ?: null,
            'name' => $source->name ?: null,
            'honoredCount' => 0,
            'spend' => 0.0,
        ];
        $row['honoredCount'] += $honored;
        $row['spend'] += $spend;
        $row['email'] ??= $source->email ?: null;
        $row['phone'] ??= $source->phone ?: null;
        $rows->put($key, $row);
    }
}
