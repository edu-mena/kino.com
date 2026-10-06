import { INITIAL_RESTAURANTS } from "./mockData";
import { getCustomRestaurants } from "./custom-restaurants-store";
import { liveMenuItems, liveRestaurant, liveRestaurants } from "./live-catalog";
import { getEffectiveMenuItems } from "./menu-store";
import { deriveRestaurantCoords } from "./restaurant-coordinates";
import { applyProfileEdits } from "./restaurant-profile-store";
import { blendedRating, getEffectiveReviews } from "./reviews-store";
import { getEffectiveStories } from "./stories-store";
import { getSubscriptions } from "./subscriptions-store";
import { applySystemFlags } from "./system-flags-store";
import type { FulfillmentType, MenuItem, Restaurant, RestaurantStory, Review } from "./types";
import { hasRealBackend } from "@/lib/api-client";
import { paymentMethods } from "@/lib/mock-data";
import { formatWeeklyHours, seedHoursFor } from "@/lib/opening-hours";

/** Edições de `/admin/perfil` + sinalizadores da área de sistema (destaque) +
 * avaliações de clientes + horário estruturado, aplicados sobre o seed.
 * É o que faz uma mudança aparecer em todo o lado que lê um restaurante.
 *
 */
function withOverrides(seed: Restaurant): Restaurant {
  const r = applySystemFlags(applyProfileEdits(seed));
  const { rating, reviewCount } = blendedRating(r.id, seed.rating, seed.reviewCount);
  const hours = r.hours ?? seedHoursFor(r.id);
  const coords =
    r.lat != null && r.lng != null
      ? { lat: r.lat, lng: r.lng }
      : deriveRestaurantCoords(r.id, r.neighborhood);
  return {
    ...r,
    rating,
    reviewCount,
    hours,
    lat: coords.lat,
    lng: coords.lng,
    openingHours: r.openingHours || formatWeeklyHours(hours, "pt"),
  };
}

/** Ids de restaurantes com subscrição suspensa. Continuam a resolver em
 * `getRestaurant()` (a página de detalhe mostra o estado "indisponível"),
 * mas o cliente esconde-os das superfícies de descoberta — ofertas e stories
 * — e bloqueia-lhes o cardápio. O painel do restaurante não é afetado. */
export function suspendedRestaurantIds(): Set<string> {
  return new Set(
    getSubscriptions()
      .filter((s) => s.status === "suspended")
      .map((s) => s.restaurantId),
  );
}

export function isRestaurantSuspended(restaurantId: string): boolean {
  return suspendedRestaurantIds().has(restaurantId);
}

/*
 * Fonte dos helpers síncronos abaixo. Com backend real, o catálogo REAL que
 * a API já devolveu (`@/data/live-catalog`) — nunca o mock: era daí que
 * vinham os restaurantes/pratos falsos (ids tipo "rest-1") que davam 404.
 * Sem backend (demo), o mock com as edições locais de sempre.
 */
function sourceRestaurants(): Restaurant[] {
  return hasRealBackend
    ? liveRestaurants()
    : [...INITIAL_RESTAURANTS, ...getCustomRestaurants()].map((r) => withOverrides(r));
}

// Pratos: no demo, `getEffectiveMenuItems()` (seed + o que o painel
// `/admin/cardapio` criar, editar ou apagar), não o seed direto.
function sourceMenuItems(): MenuItem[] {
  return hasRealBackend ? liveMenuItems() : getEffectiveMenuItems();
}

export function getRestaurant(id: string): Restaurant | undefined {
  if (hasRealBackend) return liveRestaurant(id);
  const seed =
    INITIAL_RESTAURANTS.find((r) => r.id === id) ?? getCustomRestaurants().find((r) => r.id === id);
  return seed ? withOverrides(seed) : undefined;
}

/** Todos os restaurantes, já com edições, destaque, avaliações e horário
 * aplicados (demo) ou tal como a API os devolve. Base da busca global. */
export function getAllRestaurants(): Restaurant[] {
  return sourceRestaurants();
}

export function getMenuItem(id: string): MenuItem | undefined {
  return sourceMenuItems().find((m) => m.id === id);
}

export function getMenuItemsByRestaurant(restaurantId: string): MenuItem[] {
  return sourceMenuItems().filter((m) => m.restaurantId === restaurantId);
}

/** Todas as versões (por restaurante) de um prato com este nome exato —
 * base da página "visão do prato" (`/pratos/$dishName`), que mostra a
 * faixa de preço e a lista de restaurantes antes de ir ao detalhe de um
 * em particular. */
export function getMenuItemsByName(dishName: string): MenuItem[] {
  return sourceMenuItems().filter((m) => m.name === dishName);
}

/** Outros restaurantes (além do informado) que têm um prato com o mesmo nome. */
export function getRestaurantsOfferingDish(
  dishName: string,
  excludeRestaurantId?: string,
): Restaurant[] {
  const restaurantIds = new Set(
    sourceMenuItems()
      .filter((m) => m.name === dishName && m.restaurantId !== excludeRestaurantId)
      .map((m) => m.restaurantId),
  );
  return sourceRestaurants().filter((r) => restaurantIds.has(r.id));
}

/** Ingredientes que aparecem em todas as versões (por nome) deste prato entre restaurantes. */
export function getCommonIngredients(dishName: string): string[] {
  return commonIngredientNames(sourceMenuItems().filter((m) => m.name === dishName));
}

/** Interseção dos ingredientes de várias versões do mesmo prato — para quem
 * já tem as versões na mão (ex.: `/pratos/$dishName`, vindas da API). */
export function commonIngredientNames(versions: MenuItem[]): string[] {
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
  return [...new Set(sourceMenuItems().map((m) => m.category))];
}

/** Tipos de cozinha únicos entre os restaurantes — base pros "pacotes de
 * preferências" em `/preferencias` (`cuisinePreferences`). */
export function getCuisines(): string[] {
  return [...new Set(sourceRestaurants().map((r) => r.cuisine))].sort((a, b) =>
    a.localeCompare(b, "pt"),
  );
}

/** Todos os nomes de ingrediente usados no cardápio, sem repetir — base pros
 * seletores de "ingredientes favoritos" / "ingredientes a evitar" em Preferências. */
export function getAllIngredientNames(): string[] {
  const names = new Set<string>();
  for (const item of sourceMenuItems()) {
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

/** Extrai a província de uma morada guardada — a última parte de `line2`
 * (ex: "Miramar, Luanda") que bate numa província de Angola. */
export function addressProvince(line2: string): string | undefined {
  const parts = line2.split(",").map((p) => p.trim());
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const hit = ANGOLA_PROVINCES.find((p) => p.toLowerCase() === parts[i]!.toLowerCase());
    if (hit) return hit;
  }
  return undefined;
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

/** Modos de pedido oferecidos pelo restaurante. Explícito quando o gestor
 * os definiu em `/admin/perfil`; caso contrário derivado: `delivery` só se
 * o restaurante entrega, `takeaway` e `dinein` sempre (qualquer casa pode
 * servir ao balcão ou no local). */
export function getRestaurantFulfillmentModes(restaurant: Restaurant): FulfillmentType[] {
  if (restaurant.fulfillmentModes?.length) return restaurant.fulfillmentModes;
  return [
    ...(restaurant.isDeliveryAvailable ? (["delivery"] as const) : []),
    "takeaway" as const,
    "dinein" as const,
  ];
}

/** Ids de métodos de pagamento que o restaurante aceita — todos quando não
 * restringiu a lista. */
export function getRestaurantPaymentMethodIds(restaurant: Restaurant): string[] {
  const all = paymentMethods.map((m) => m.id);
  const chosen = restaurant.acceptedPaymentMethods?.filter((id) => all.includes(id)) ?? [];
  return chosen.length ? chosen : all;
}

/** A caução configurada aplica-se a pedidos neste modo? */
export function orderModeRequiresCaution(restaurant: Restaurant, mode: FulfillmentType): boolean {
  return restaurant.cautionAmount > 0 && (restaurant.cautionModesForOrders ?? []).includes(mode);
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

/** Avaliações de um restaurante, mais recente primeiro — seed + as deixadas
 * por clientes (ver `@/data/reviews-store`). */
export function getReviewsForRestaurant(restaurantId: string): Review[] {
  return getEffectiveReviews()
    .filter((r) => r.restaurantId === restaurantId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
