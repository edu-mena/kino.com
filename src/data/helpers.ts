import {
  INITIAL_MENU_ITEMS,
  INITIAL_RESTAURANTS,
  INITIAL_REVIEWS,
  INITIAL_STORIES,
} from "./mockData";
import type { MenuItem, Restaurant, RestaurantStory, Review } from "./types";

export function getRestaurant(id: string): Restaurant | undefined {
  return INITIAL_RESTAURANTS.find((r) => r.id === id);
}

export function getMenuItem(id: string): MenuItem | undefined {
  return INITIAL_MENU_ITEMS.find((m) => m.id === id);
}

export function getMenuItemsByRestaurant(restaurantId: string): MenuItem[] {
  return INITIAL_MENU_ITEMS.filter((m) => m.restaurantId === restaurantId);
}

/** Outros restaurantes (além do informado) que têm um prato com o mesmo nome. */
export function getRestaurantsOfferingDish(
  dishName: string,
  excludeRestaurantId?: string,
): Restaurant[] {
  const restaurantIds = new Set(
    INITIAL_MENU_ITEMS.filter(
      (m) => m.name === dishName && m.restaurantId !== excludeRestaurantId,
    ).map((m) => m.restaurantId),
  );
  return INITIAL_RESTAURANTS.filter((r) => restaurantIds.has(r.id));
}

/** Ingredientes que aparecem em todas as versões (por nome) deste prato entre restaurantes. */
export function getCommonIngredients(dishName: string): string[] {
  const versions = INITIAL_MENU_ITEMS.filter((m) => m.name === dishName);
  if (versions.length === 0) return [];
  const [first, ...rest] = versions;
  let common = new Set(first!.ingredients.map((i) => i.name));
  for (const v of rest) {
    const names = new Set(v.ingredients.map((i) => i.name));
    common = new Set([...common].filter((n) => names.has(n)));
  }
  return [...common];
}

export function getMenuCategories(): string[] {
  return [...new Set(INITIAL_MENU_ITEMS.map((m) => m.category))];
}

/** Todos os nomes de ingrediente usados no cardápio, sem repetir — base pros
 * seletores de "ingredientes favoritos" / "ingredientes a evitar" em Preferências. */
export function getAllIngredientNames(): string[] {
  const names = new Set<string>();
  for (const item of INITIAL_MENU_ITEMS) {
    for (const ing of item.ingredients) names.add(ing.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "pt"));
}

/** Bairros únicos dos restaurantes — base pro seletor de "locais de recebimento". */
export function getNeighborhoods(): string[] {
  return [...new Set(INITIAL_RESTAURANTS.map((r) => r.neighborhood))];
}

/** Bairros cobertos pela entrega deste restaurante — vazio quando não entrega
 * em lugar nenhum; assume só o próprio bairro quando `deliveryZones` não foi
 * definido explicitamente. */
export function getDeliveryZones(restaurant: Restaurant): string[] {
  if (!restaurant.isDeliveryAvailable) return [];
  return restaurant.deliveryZones ?? [restaurant.neighborhood];
}

/** Se este restaurante entrega no bairro informado. Sem bairro informado,
 * cai no simples "entrega em algum lugar" (`isDeliveryAvailable`). */
export function canDeliverToNeighborhood(restaurant: Restaurant, neighborhood?: string): boolean {
  if (!restaurant.isDeliveryAvailable) return false;
  if (!neighborhood) return true;
  return getDeliveryZones(restaurant).includes(neighborhood);
}

/** Stories de um restaurante, do mais antigo pro mais recente (ordem de exibição). */
export function getStoriesForRestaurant(restaurantId: string): RestaurantStory[] {
  return INITIAL_STORIES.filter((s) => s.restaurantId === restaurantId).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/** Avaliações de um restaurante, mais recente primeiro — usado no painel do
 * restaurante (`/admin/avaliacoes`). */
export function getReviewsForRestaurant(restaurantId: string): Review[] {
  return INITIAL_REVIEWS.filter((r) => r.restaurantId === restaurantId).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/** Restaurantes que têm pelo menos um story, mais recente primeiro. */
export function getRestaurantsWithStories(): Restaurant[] {
  const idsByLatestStory = new Map<string, number>();
  for (const story of INITIAL_STORIES) {
    const time = new Date(story.createdAt).getTime();
    const current = idsByLatestStory.get(story.restaurantId);
    if (current === undefined || time > current) {
      idsByLatestStory.set(story.restaurantId, time);
    }
  }
  return [...idsByLatestStory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => getRestaurant(id))
    .filter((r): r is Restaurant => !!r);
}
