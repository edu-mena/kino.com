import { safeLocalStorageSet } from "./safe-storage";
import type { Restaurant } from "./types";

/**
 * Edição de perfil do restaurante (`/admin/perfil`) — mesmo desenho das
 * outras stores (`menu-store.ts`, `menus-store.ts`): funções puras e
 * síncronas, seguras em SSR (`typeof window`), guardando só a diferença
 * face ao seed, por `restaurantId`.
 *
 * Nem todos os campos de `Restaurant` são editáveis aqui — `id`, `name`,
 * `rating`, `reviewCount`, `distanceKm` e `isFeatured` são geridos pela
 * Kino (identidade, reputação agregada de avaliações reais, curadoria de
 * destaque) e ficam de fora do formulário; para mudar esses, o painel
 * encaminha para `/admin/suporte`.
 */
export type RestaurantProfileEdit = Partial<
  Pick<
    Restaurant,
    | "description"
    | "cuisine"
    | "priceLevel"
    | "address"
    | "neighborhood"
    | "city"
    | "phone"
    | "email"
    | "openingHours"
    | "coverImage"
    | "galleryImages"
    | "isDeliveryAvailable"
    | "deliveryZones"
    | "deliveryFee"
    | "estimatedDeliveryMinutes"
    | "cautionAmount"
    | "cautionPolicyNotice"
    | "acceptsReservations"
    | "reservationSlotMinutes"
    | "hours"
    | "ordersPausedManually"
  >
>;

const PROFILE_KEY = "kino_restaurant_profile_edits";
const CHANGE_EVENT = "kino:menu-changed";

function readState(): Record<string, RestaurantProfileEdit> {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(PROFILE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function writeState(state: Record<string, RestaurantProfileEdit>): boolean {
  if (typeof window === "undefined") return true;
  const ok = safeLocalStorageSet(PROFILE_KEY, JSON.stringify(state));
  if (ok) window.dispatchEvent(new Event(CHANGE_EVENT));
  return ok;
}

/** Aplica as edições guardadas de um restaurante sobre o registo do seed —
 * é isto que `getRestaurant()` usa, para que a mudança apareça em todo o
 * lado (painel e app do cliente), não só no formulário. */
export function applyProfileEdits(restaurant: Restaurant): Restaurant {
  const edits = readState()[restaurant.id];
  return edits ? { ...restaurant, ...edits } : restaurant;
}

export function getProfileEdits(restaurantId: string): RestaurantProfileEdit {
  return readState()[restaurantId] ?? {};
}

/** `false` = a escrita falhou (ex: quota do localStorage excedida, comum
 * quando a capa/galeria têm imagens grandes em base64). */
export function saveProfileEdits(restaurantId: string, edits: RestaurantProfileEdit): boolean {
  const state = readState();
  return writeState({ ...state, [restaurantId]: { ...state[restaurantId], ...edits } });
}
