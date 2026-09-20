import { getAllRestaurants, getRestaurantFulfillmentModes } from "@/data/helpers";
import type { FulfillmentType, Restaurant } from "@/data/types";
import type { Locale } from "@/i18n";
import { computeRestaurantStatus } from "@/lib/restaurant-status";

/**
 * Alternativas a sugerir quando um restaurante não dá para usar agora
 * (pausado, fora de horário, subscrição suspensa, ou simplesmente não serve
 * o modo pedido) — usado pelo `RestaurantRecommendationsDialog`, em popups
 * (card de pedido, página do restaurante) e nas notificações (pedido
 * recusado). Mesma cozinha primeiro, depois por avaliação; só entram
 * restaurantes DISPONÍVEIS agora — recomendar outro que está igualmente
 * fechado não ajudava ninguém.
 */
export function getRecommendedRestaurants({
  excludeId,
  cuisine,
  mode,
  subStatusOf,
  locale,
  limit = 3,
}: {
  /** Nunca recomenda o próprio restaurante indisponível. */
  excludeId: string;
  /** Cozinha do restaurante indisponível — os da mesma vêm primeiro. */
  cuisine?: string;
  /** Só entram restaurantes que servem este modo (ex: não adianta sugerir
   * um que não faz entregas quando foi isso que falhou). */
  mode?: FulfillmentType | undefined;
  /** `byRestaurant(id)?.status` de `useSubscriptions()` — vem de fora
   * porque é um hook, isto não é. */
  subStatusOf: (restaurantId: string) => string | undefined;
  locale?: Locale;
  limit?: number;
}): Restaurant[] {
  const scored = getAllRestaurants()
    .filter((r) => r.id !== excludeId)
    .filter((r) => !mode || getRestaurantFulfillmentModes(r).includes(mode))
    .filter((r) => computeRestaurantStatus(r, subStatusOf(r.id), locale).available)
    .map((r) => ({ r, sameCuisine: !!cuisine && r.cuisine === cuisine }));

  scored.sort((a, b) => {
    if (a.sameCuisine !== b.sameCuisine) return a.sameCuisine ? -1 : 1;
    return b.r.rating - a.r.rating;
  });

  return scored.slice(0, limit).map((s) => s.r);
}
