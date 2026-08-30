import { INITIAL_RESTAURANTS, INITIAL_REVIEWS } from "./mockData";
import { getEffectiveMenuItems } from "./menu-store";
import { applyProfileEdits } from "./restaurant-profile-store";
import { getEffectiveStories } from "./stories-store";
import type { MenuItem, Restaurant, RestaurantStory, Review } from "./types";

/** Aplica as edições guardadas em `/admin/perfil` (ver
 * `@/data/restaurant-profile-store`) sobre o seed — assim uma mudança feita
 * lá aparece em todo o lado que lê um restaurante, painel e cliente. */
export function getRestaurant(id: string): Restaurant | undefined {
  const restaurant = INITIAL_RESTAURANTS.find((r) => r.id === id);
  return restaurant ? applyProfileEdits(restaurant) : undefined;
}

/** Todos os restaurantes, já com as edições do `/admin/perfil` aplicadas —
 * base pra busca global (ver `header-search.tsx`), que precisa devolver o
 * próprio restaurante como resultado, não só os seus pratos. */
export function getAllRestaurants(): Restaurant[] {
  return INITIAL_RESTAURANTS.map(applyProfileEdits);
}

// Todas as funções de prato abaixo leem de `getEffectiveMenuItems()`, não do
// seed (`INITIAL_MENU_ITEMS`) diretamente — assim refletem também o que o
// painel do restaurante (`/admin/cardapio`) criar, editar ou apagar. É
// síncrona e segura em SSR (ver `@/data/menu-store`), por isso pode ser
// chamada em qualquer lado, incluindo `loader()` de rotas.

export function getMenuItem(id: string): MenuItem | undefined {
  return getEffectiveMenuItems().find((m) => m.id === id);
}

export function getMenuItemsByRestaurant(restaurantId: string): MenuItem[] {
  return getEffectiveMenuItems().filter((m) => m.restaurantId === restaurantId);
}

/** Todas as versões (por restaurante) de um prato com este nome exato —
 * base da página "visão do prato" (`/pratos/$dishName`), que mostra a
 * faixa de preço e a lista de restaurantes antes de ir ao detalhe de um
 * em particular. */
export function getMenuItemsByName(dishName: string): MenuItem[] {
  return getEffectiveMenuItems().filter((m) => m.name === dishName);
}

/** Outros restaurantes (além do informado) que têm um prato com o mesmo nome. */
export function getRestaurantsOfferingDish(
  dishName: string,
  excludeRestaurantId?: string,
): Restaurant[] {
  const restaurantIds = new Set(
    getEffectiveMenuItems()
      .filter((m) => m.name === dishName && m.restaurantId !== excludeRestaurantId)
      .map((m) => m.restaurantId),
  );
  return INITIAL_RESTAURANTS.filter((r) => restaurantIds.has(r.id));
}

/** Ingredientes que aparecem em todas as versões (por nome) deste prato entre restaurantes. */
export function getCommonIngredients(dishName: string): string[] {
  const versions = getEffectiveMenuItems().filter((m) => m.name === dishName);
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
  return [...new Set(getEffectiveMenuItems().map((m) => m.category))];
}

/** Tipos de cozinha únicos entre os restaurantes — base pros "pacotes de
 * preferências" em `/preferencias` (`cuisinePreferences`). */
export function getCuisines(): string[] {
  return [...new Set(INITIAL_RESTAURANTS.map((r) => r.cuisine))].sort((a, b) =>
    a.localeCompare(b, "pt"),
  );
}

/** Todos os nomes de ingrediente usados no cardápio, sem repetir — base pros
 * seletores de "ingredientes favoritos" / "ingredientes a evitar" em Preferências. */
export function getAllIngredientNames(): string[] {
  const names = new Set<string>();
  for (const item of getEffectiveMenuItems()) {
    for (const ing of item.ingredients) names.add(ing.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "pt"));
}

/** As 18 províncias de Angola, em ordem alfabética — lista fixa, não derivada
 * dos restaurantes, para o seletor de localização mostrar sempre todas as
 * opções mesmo que hoje não haja restaurante numa delas. */
export const ANGOLA_PROVINCES = [
  "Bengo",
  "Benguela",
  "Bié",
  "Cabinda",
  "Cuando Cubango",
  "Cuanza Norte",
  "Cuanza Sul",
  "Cunene",
  "Huambo",
  "Huíla",
  "Luanda",
  "Lunda Norte",
  "Lunda Sul",
  "Malanje",
  "Moxico",
  "Namibe",
  "Uíge",
  "Zaire",
] as const;

/** Todas as províncias de Angola — base pro seletor de "locais de recebimento". */
export function getProvinces(): string[] {
  return [...ANGOLA_PROVINCES];
}

/** Províncias cobertas pela entrega deste restaurante — vazio quando não
 * entrega em lugar nenhum; assume só a própria província quando
 * `deliveryZones` não foi definido explicitamente. */
export function getDeliveryZones(restaurant: Restaurant): string[] {
  if (!restaurant.isDeliveryAvailable) return [];
  return restaurant.deliveryZones ?? [restaurant.neighborhood];
}

/** Se este restaurante entrega na província informada. Sem província
 * informada, cai no simples "entrega em algum lugar" (`isDeliveryAvailable`). */
export function canDeliverToNeighborhood(restaurant: Restaurant, neighborhood?: string): boolean {
  if (!restaurant.isDeliveryAvailable) return false;
  if (!neighborhood) return true;
  return getDeliveryZones(restaurant).includes(neighborhood);
}

/** Stories de um restaurante, do mais antigo pro mais recente (ordem de
 * exibição) — lê de `getEffectiveStories()`, não do seed diretamente, para
 * refletir também o que o painel do restaurante (`/admin/stories`) criar
 * ou apagar. */
export function getStoriesForRestaurant(restaurantId: string): RestaurantStory[] {
  return getEffectiveStories()
    .filter((s) => s.restaurantId === restaurantId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
  for (const story of getEffectiveStories()) {
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
