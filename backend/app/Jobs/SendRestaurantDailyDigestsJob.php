<?php

namespace App\Jobs;

use App\Mail\RestaurantDailyDigestMail;
use App\Models\Restaurant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

/**
 * Resumo diário por email (Fase N6) — decisão confirmada com o utilizador:
 * um resumo por dia, nunca um email por evento (encheria a caixa de entrada
 * de um restaurante movimentado). Só envia a quem teve pelo menos um evento
 * no dia anterior — sem ruído para quem não teve nada. Restaurantes com a
 * subscrição suspensa não recebem (mesmo espírito de `RestaurantGate` no
 * painel — sem acesso, sem resumo).
 */
class SendRestaurantDailyDigestsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $from = now()->subDay()->startOfDay();
        $to = now()->startOfDay();

        Restaurant::query()
            ->with('subscription')
            ->whereNotNull('email')
            ->chunkById(50, function ($restaurants) use ($from, $to) {
                foreach ($restaurants as $restaurant) {
                    if ($restaurant->subscription?->isLocked()) {
                        continue;
                    }

                    $summary = $this->summaryFor($restaurant, $from, $to);
                    if (! $summary['hasActivity']) {
                        continue;
                    }

                    Mail::to($restaurant->email)->queue(new RestaurantDailyDigestMail($restaurant, $summary));
                }
            });
    }

    /**
     * @return array{
     *     hasActivity: bool,
     *     ordersCount: int,
     *     ordersRevenue: float,
     *     reservationsCount: int,
     *     reservationsConfirmed: int,
     *     reviewsCount: int,
     *     reviewsAvgRating: float|null,
     * }
     */
    private function summaryFor(Restaurant $restaurant, Carbon $from, Carbon $to): array
    {
        $orders = $restaurant->orders()->whereBetween('created_at', [$from, $to])->get();
        $deliveredRevenue = $orders->whereIn('status', ['delivered', 'completed'])->sum('total');

        $reservations = $restaurant->reservations()->whereBetween('created_at', [$from, $to])->get();

        $reviews = $restaurant->reviews()->whereBetween('created_at', [$from, $to])->get();

        $ordersCount = $orders->count();
        $reservationsCount = $reservations->count();
        $reviewsCount = $reviews->count();

        return [
            'hasActivity' => $ordersCount > 0 || $reservationsCount > 0 || $reviewsCount > 0,
            'ordersCount' => $ordersCount,
            'ordersRevenue' => (float) $deliveredRevenue,
            'reservationsCount' => $reservationsCount,
            'reservationsConfirmed' => $reservations->where('status', 'confirmed')->count(),
            'reviewsCount' => $reviewsCount,
            'reviewsAvgRating' => $reviewsCount > 0 ? round((float) $reviews->avg('rating'), 1) : null,
        ];
    }
}
