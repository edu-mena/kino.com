import { useMemo } from "react";
import { getRestaurant } from "@/data/helpers";
import type { MenuItem, Restaurant } from "@/data/types";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { viewerKey } from "@/lib/customer";
import { categoriesByCount, restaurantPopularity, type CategoryCount } from "@/lib/popularity";
import { diversifyByKey } from "@/lib/recommend-dishes";
import {
  buildBehaviorProfile,
  norm,
  useTasteEvents,
  type BehaviorProfile,
} from "@/lib/taste-signals";

/**
 * Ordem das listagens para ESTE cliente ("algoritmo Luku"), a partir do
 * perfil de `@/lib/taste-signals`. Sem histórico (cliente novo) tudo isto
 * dá zero e fica a ordem da Fase 3 (popularidade, distância), só com a
 * variação diária.
 */

/** Pontos de histórico a partir dos quais o perfil vale por inteiro —
 * ~2 pedidos ou ~5 pratos abertos. Abaixo disso conta proporcionalmente:
 * um prato aberto uma vez não reorganiza a home inteira. */
const FULL_CONFIDENCE_POINTS = 10;

export function profileConfidence(profile: BehaviorProfile): number {
  return Math.min(1, profile.total / FULL_CONFIDENCE_POINTS);
}

const maxOf = (map: Map<string, number>) => Math.max(0, ...map.values());

/** 0..1 — quanto o cliente gosta desta categoria, face à preferida dele. */
function relative(map: Map<string, number>, key: string | undefined): number {
  if (!key) return 0;
  const max = maxOf(map);
  return max > 0 ? (map.get(key) ?? 0) / max : 0;
}

/** Afinidade de um prato com o histórico (0 a ~36): categoria pesa mais,
 * depois ingredientes, cozinha e restaurante. */
export function dishBehaviorScore(
  item: MenuItem,
  profile: BehaviorProfile,
  getCuisine: (restaurantId: string) => string | undefined = () => undefined,
): number {
  if (profile.total <= 0) return 0;
  const category = relative(profile.categories, norm(item.category));
  const ingredientSum = item.ingredients.reduce(
    (sum, ing) => sum + relative(profile.ingredients, norm(ing.name)),
    0,
  );
  const ingredients = Math.min(1, ingredientSum / 2);
  const cuisineName = getCuisine(item.restaurantId);
  const cuisine = relative(profile.cuisines, cuisineName ? norm(cuisineName) : undefined);
  const restaurant = relative(profile.restaurants, item.restaurantId);
  return (
    (category * 14 + ingredients * 10 + cuisine * 6 + restaurant * 6) * profileConfidence(profile)
  );
}

/** Categorias pela ordem para este cliente: nº de pratos (0..1) + gosto
 * (0..2). Sem histórico = a ordem por nº de pratos da Fase 3. */
export function personalizedCategories(
  items: Pick<MenuItem, "category">[],
  profile: BehaviorProfile,
): CategoryCount[] {
  const counts = categoriesByCount(items);
  const maxCount = Math.max(1, ...counts.map((c) => c.count));
  const confidence = profileConfidence(profile);
  const score = (c: CategoryCount) =>
    c.count / maxCount + 2 * relative(profile.categories, norm(c.category)) * confidence;
  return [...counts].sort((a, b) => score(b) - score(a) || b.count - a.count);
}

/** As secções de categoria da home: as `limit` primeiras da ordem pessoal
 * com pelo menos `minItems` pratos. */
export function personalizedTopCategories(
  items: Pick<MenuItem, "category">[],
  profile: BehaviorProfile,
  limit = 3,
  minItems = 3,
): string[] {
  return personalizedCategories(items, profile)
    .filter((c) => c.count >= minItems)
    .slice(0, limit)
    .map((c) => c.category);
}

// ---------------------------------------------------------------------------
// Variação diária
// ---------------------------------------------------------------------------

/** FNV-1a 32 bits — determinístico, sem dependências. */
function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Semente do dia para esta pessoa: a ordem muda de um dia para o outro,
 * mas não a cada vez que a home abre. */
export function dailySeed(viewer: string, date: Date = new Date()): string {
  const day = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  return `${viewer}:${day}`;
}

/** 0..1 estável para (semente, id). */
export function rotationJitter(seed: string, id: string): number {
  return hash32(`${seed}|${id}`) / 0xffffffff;
}

/** Pratos de uma secção de categoria: mais pedidos + gosto pessoal +
 * variação do dia (só baralha pratos com pontuação parecida), sem vários
 * seguidos do mesmo restaurante. */
export function rankSectionDishes(
  items: MenuItem[],
  profile: BehaviorProfile,
  seed: string,
  getCuisine: (restaurantId: string) => string | undefined = () => undefined,
): MenuItem[] {
  const score = (item: MenuItem) =>
    Math.log2(1 + (item.orderCount ?? 0)) * 6 +
    (item.isPromoted ? 2 : 0) +
    dishBehaviorScore(item, profile, getCuisine) * 0.5 +
    rotationJitter(seed, item.id) * 4;
  const scored = items.map((item) => ({ item, score: score(item) }));
  scored.sort((a, b) => b.score - a.score);
  return diversifyByKey(
    scored.map((s) => s.item),
    (item) => item.restaurantId,
  );
}

/** Popularidade + o histórico DESTE cliente com o restaurante (pedidos,
 * pratos abertos lá) — quem já encomendou num sítio vê-o mais à frente
 * nos "Populares". Até ~30 pontos, o equivalente a uns 10 pedidos alheios. */
export function personalPopularity(
  restaurant: Pick<
    Restaurant,
    "id" | "rating" | "reviewCount" | "followersCount" | "recentOrdersCount" | "name"
  >,
  profile: BehaviorProfile,
): number {
  return (
    restaurantPopularity(restaurant) +
    relative(profile.restaurants, restaurant.id) * 30 * profileConfidence(profile)
  );
}

export function byPersonalPopularity(profile: BehaviorProfile) {
  return (
    a: Parameters<typeof personalPopularity>[0],
    b: Parameters<typeof personalPopularity>[0],
  ) =>
    personalPopularity(b, profile) - personalPopularity(a, profile) ||
    a.name.localeCompare(b.name, "pt");
}

/**
 * Perfil + semente do dia para quem está a ver. `items` é o catálogo já
 * carregado (resolve os pratos dos pedidos e as pesquisas) — quem não o tem
 * (ex.: /restaurantes) passa `[]` e os pedidos contam só pelo restaurante.
 */
export function usePersonalization(items: MenuItem[] = []): {
  profile: BehaviorProfile;
  seed: string;
} {
  const events = useTasteEvents();
  const { orders } = useCart();
  const { user } = useAuth();
  const viewer = viewerKey(user);
  const myOrders = useMemo(() => orders.filter((o) => o.ownerKey === viewer), [orders, viewer]);
  const profile = useMemo(
    () =>
      buildBehaviorProfile({
        events,
        orders: myOrders,
        items,
        getCuisine: (restaurantId) => getRestaurant(restaurantId)?.cuisine,
      }),
    [events, myOrders, items],
  );
  const seed = dailySeed(viewer);
  return { profile, seed };
}
