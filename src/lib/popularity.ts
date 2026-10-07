import type { MenuItem, Restaurant } from "@/data/types";

/**
 * Ordem das listagens de cliente (home, /restaurantes, secções de
 * categoria). Os números vêm da API (pedidos dos últimos 30 dias e
 * seguidores — ver backend App\Support\Popularity); sem backend (demo)
 * ficam a zero e manda a avaliação.
 */

/** Avaliação "a priori" de um restaurante sem avaliações, e quantas
 * avaliações ela vale. */
const PRIOR_RATING = 4;
const PRIOR_WEIGHT = 5;

/** Média bayesiana: 5★ com 1 avaliação não passa à frente de 4,6★ com 80 —
 * poucas avaliações puxam para perto de PRIOR_RATING. */
export function adjustedRating(r: Pick<Restaurant, "rating" | "reviewCount">): number {
  const n = Math.max(0, r.reviewCount ?? 0);
  return (r.rating * n + PRIOR_RATING * PRIOR_WEIGHT) / (n + PRIOR_WEIGHT);
}

type PopularityFields = Pick<
  Restaurant,
  "name" | "rating" | "reviewCount" | "followersCount" | "recentOrdersCount"
>;

/** Pedidos recentes pesam mais (gente a comprar agora), depois
 * seguidores, depois a avaliação ajustada (×10 ≈ 0–50 pontos). */
export function restaurantPopularity(r: PopularityFields): number {
  return (r.recentOrdersCount ?? 0) * 3 + (r.followersCount ?? 0) + adjustedRating(r) * 10;
}

/** Comparador: mais popular primeiro; empate por nome (ordem estável). */
export function byPopularity(a: PopularityFields, b: PopularityFields): number {
  return restaurantPopularity(b) - restaurantPopularity(a) || a.name.localeCompare(b.name, "pt");
}

/** Pratos mais pedidos primeiro; empate: em promoção, depois nome. */
export function byDishPopularity(
  a: Pick<MenuItem, "name" | "orderCount" | "isPromoted">,
  b: Pick<MenuItem, "name" | "orderCount" | "isPromoted">,
): number {
  return (
    (b.orderCount ?? 0) - (a.orderCount ?? 0) ||
    Number(!!b.isPromoted) - Number(!!a.isPromoted) ||
    a.name.localeCompare(b.name, "pt")
  );
}

export type CategoryCount = { category: string; count: number };

/** Categorias pelo nº de pratos (mais primeiro), empate por nome. */
export function categoriesByCount(items: Pick<MenuItem, "category">[]): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!item.category) continue;
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }
  return [...counts]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, "pt"));
}

/** As `limit` categorias com mais pratos que tenham pelo menos `minItems`
 * (uma secção de 1–2 pratos parecia vazia) — as secções de categoria da
 * home. */
export function topCategories(
  items: Pick<MenuItem, "category">[],
  limit = 3,
  minItems = 3,
): string[] {
  return categoriesByCount(items)
    .filter((c) => c.count >= minItems)
    .slice(0, limit)
    .map((c) => c.category);
}
