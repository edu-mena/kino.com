import { safeLocalStorageSet } from "./safe-storage";
import type { Restaurant } from "./types";

/**
 * Sinalizadores de plataforma por restaurante, geridos na área de sistema
 * (`/sistema/restaurantes`) — hoje só a curadoria de destaque (`isFeatured`).
 * Store pura e síncrona, segura em SSR, aplicada em `helpers.ts` sobre o
 * seed a seguir a `applyProfileEdits` — para o destaque aparecer em todo o
 * lado que lê um restaurante via `getRestaurant()` / `getAllRestaurants()`.
 */
type SystemFlags = { featured?: boolean };

const KEY = "kino_system_restaurant_flags_v1";
const CHANGE_EVENT = "kino:menu-changed";

function read(): Record<string, SystemFlags> {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function write(state: Record<string, SystemFlags>): boolean {
  if (typeof window === "undefined") return true;
  const ok = safeLocalStorageSet(KEY, JSON.stringify(state));
  if (ok) window.dispatchEvent(new Event(CHANGE_EVENT));
  return ok;
}

export function applySystemFlags(restaurant: Restaurant): Restaurant {
  const flags = read()[restaurant.id];
  if (!flags || flags.featured === undefined) return restaurant;
  return { ...restaurant, isFeatured: flags.featured };
}

export function isFeaturedOverridden(restaurantId: string): boolean | undefined {
  return read()[restaurantId]?.featured;
}

export function setFeatured(restaurantId: string, featured: boolean) {
  const state = read();
  write({ ...state, [restaurantId]: { ...state[restaurantId], featured } });
}
