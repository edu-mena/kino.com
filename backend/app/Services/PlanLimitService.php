<?php

namespace App\Services;

use App\Models\Offer;
use App\Models\Restaurant;
use App\Models\RestaurantStory;

/**
 * Único sítio que sabe "quanto é que este restaurante já usou" e "o plano
 * dele permite mais um" — ver `config/plans.php` para a matriz Pro/Plus.
 *
 * Contagens reaproveitam os scopes que já existem para outra coisa
 * (`RestaurantStory::scopeFresh`, `Offer::scopeActive`) em vez de inventar um
 * segundo conceito de "ativo" — Reservas é a única contagem nova (não havia
 * nenhuma noção de "reservas este mês" em lado nenhum antes desta feature).
 */
class PlanLimitService
{
    /** Sem subscrição (nunca deveria acontecer em produção — toda a
     * aprovação de candidatura cria uma, ver `ApprovePartnerApplication` —
     * mas acontece em muitos testes/factories) cai para Plus, nunca Pro:
     * mesma filosofia "falha aberta" já usada em `Restaurant::isSuspended`
     * (RestaurantTest.php: "restaurante sem subscrição aparece como não
     * suspenso") — a ausência de dados não deve ser tratada como o tier mais
     * restritivo. */
    public function planFor(Restaurant $restaurant): string
    {
        return $restaurant->subscription?->plan ?? 'plus';
    }

    public function priceFor(string $plan): int
    {
        return (int) config("plans.{$plan}.price", 0);
    }

    /** `null` = sem tecto. */
    public function limit(Restaurant $restaurant, string $feature): ?int
    {
        return config('plans.'.$this->planFor($restaurant).'.limits.'.$feature);
    }

    public function usage(Restaurant $restaurant, string $feature): int
    {
        return match ($feature) {
            'stories' => $restaurant->stories()->fresh()->count(),
            'offers' => $restaurant->offers()->active()->count(),
            'reservations_per_month' => $restaurant->reservations()
                ->whereYear('date', now()->year)
                ->whereMonth('date', now()->month)
                ->count(),
            default => 0,
        };
    }

    public function hasCapacity(Restaurant $restaurant, string $feature): bool
    {
        $limit = $this->limit($restaurant, $feature);

        return $limit === null || $this->usage($restaurant, $feature) < $limit;
    }

    /** Funcionalidades tudo-ou-nada (Pacotes, Gestão de Clientes, Estatísticas). */
    public function allows(Restaurant $restaurant, string $feature): bool
    {
        return (bool) config('plans.'.$this->planFor($restaurant).'.features.'.$feature, false);
    }
}
