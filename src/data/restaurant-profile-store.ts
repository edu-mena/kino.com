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
 * Luku (identidade, reputação agregada de avaliações reais, curadoria de
 * destaque) e ficam de fora do formulário; para mudar esses, o painel
 * encaminha para `/admin/suporte`.
 */
export type RestaurantProfileEdit = Partial<
  Pick<
    Restaurant,
    | "description"
    | "cuisine"
    | "address"
    | "neighborhood"
    | "city"
    | "lat"
    | "lng"
    | "phone"
    | "email"
    | "openingHours"
    | "coverImage"
    | "galleryImages"
    | "wallpaper"
    | "isDeliveryAvailable"
    | "fulfillmentModes"
    | "acceptedPaymentMethods"
    | "paymentDetails"
    | "cautionModesForOrders"
    | "deliveryZones"
    | "deliveryFee"
    | "estimatedDeliveryMinutes"
    | "cautionAmount"
    | "cautionPolicyNotice"
    | "buffetPrice"
    | "buffetHoursNotice"
    | "buffetTableTimeLimitMinutes"
    | "acceptsReservations"
    | "reservationSlotMinutes"
    | "reservationCancellationWindowMinutes"
    | "hours"
    | "ordersPausedManually"
  >
>;

const PROFILE_KEY = "luku_restaurant_profile_edits";
// Galeria separada do resto do perfil de propósito — imagens em base64 são
// o único campo grande o suficiente pra estourar a quota do localStorage.
// Antes vivia tudo junto num único blob (todos os restaurantes, todos os
// campos, incluindo galeria); uma escrita que excedesse a quota falhava
// por INTEIRO, então editar qualquer outro campo do perfil na mesma
// submissão também não gravava — e como a galeria de uma gravação anterior
// menor continuava no blob (nunca chegou a falhar), parecia que "as
// imagens gravaram mas o resto não" (bug real, reportado em teste). Uma
// falha de quota aqui agora só afeta a galeria, nunca o resto do perfil.
const GALLERY_KEY = "luku_restaurant_gallery_edits";
const CHANGE_EVENT = "luku:menu-changed";

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

function readGalleryState(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(GALLERY_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function writeGalleryState(state: Record<string, string[]>): boolean {
  if (typeof window === "undefined") return true;
  const ok = safeLocalStorageSet(GALLERY_KEY, JSON.stringify(state));
  if (ok) window.dispatchEvent(new Event(CHANGE_EVENT));
  return ok;
}

/** Aplica as edições guardadas de um restaurante sobre o registo do seed —
 * é isto que `getRestaurant()` usa, para que a mudança apareça em todo o
 * lado (painel e app do cliente), não só no formulário. */
export function applyProfileEdits(restaurant: Restaurant): Restaurant {
  const edits = readState()[restaurant.id];
  const gallery = readGalleryState()[restaurant.id];
  return {
    ...restaurant,
    ...edits,
    ...(gallery ? { galleryImages: gallery } : {}),
  };
}

export function getProfileEdits(restaurantId: string): RestaurantProfileEdit {
  const edits = readState()[restaurantId] ?? {};
  const gallery = readGalleryState()[restaurantId];
  return gallery ? { ...edits, galleryImages: gallery } : edits;
}

/** `false` = pelo menos uma das duas escritas falhou (ex: quota do
 * localStorage excedida) — galeria e resto do perfil gravam-se em separado
 * agora, então uma falha num não impede o outro (ver comentário de
 * `GALLERY_KEY` acima). */
export function saveProfileEdits(restaurantId: string, edits: RestaurantProfileEdit): boolean {
  const { galleryImages, ...rest } = edits;
  let ok = true;

  if (galleryImages !== undefined) {
    const galleryState = readGalleryState();
    ok = writeGalleryState({ ...galleryState, [restaurantId]: galleryImages }) && ok;
  }

  if (Object.keys(rest).length > 0) {
    const state = readState();
    ok = writeState({ ...state, [restaurantId]: { ...state[restaurantId], ...rest } }) && ok;
  }

  return ok;
}
