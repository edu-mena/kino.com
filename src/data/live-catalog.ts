import { useSyncExternalStore } from "react";
import type { MenuItem, Restaurant } from "./types";

/**
 * Catálogo REAL em memória (restaurantes e pratos vindos da API), para os
 * helpers síncronos de `@/data/helpers` (`getRestaurant`, `getMenuItem`,
 * pratos por nome, cozinhas...) responderem com dados reais quando há
 * backend — antes liam sempre o mock (`mockData`), e por isso a pesquisa da
 * página inicial mostrava restaurantes falsos que davam 404 ao abrir.
 *
 * Preenchido pelas funções de `@/data/api-restaurants` sempre que a API
 * devolve restaurantes/pratos. Só no browser: no servidor (SSR) fica vazio
 * de propósito — o HTML do SSR tem de coincidir com o primeiro render do
 * cliente (hidratação), e entre pedidos de pessoas diferentes não se partilha
 * nada. Componentes que leem os helpers durante o render usam
 * `useLiveCatalogVersion()` para voltarem a desenhar quando chegam dados.
 */

const restaurants = new Map<string, Restaurant>();
const menuItems = new Map<string, MenuItem>();
const listeners = new Set<() => void>();
let version = 0;

const isBrowser = typeof window !== "undefined";

function changed() {
  version += 1;
  for (const listener of listeners) listener();
}

export function rememberRestaurants(list: Restaurant[]): void {
  if (!isBrowser || list.length === 0) return;
  for (const r of list) restaurants.set(r.id, r);
  changed();
}

export function rememberMenuItems(list: MenuItem[]): void {
  if (!isBrowser || list.length === 0) return;
  for (const m of list) menuItems.set(m.id, m);
  changed();
}

export function liveRestaurants(): Restaurant[] {
  return [...restaurants.values()];
}

export function liveRestaurant(id: string): Restaurant | undefined {
  return restaurants.get(id);
}

export function liveMenuItems(): MenuItem[] {
  return [...menuItems.values()];
}

export function liveMenuItem(id: string): MenuItem | undefined {
  return menuItems.get(id);
}

/** Quando foi carregado o cardápio COMPLETO (todos os restaurantes, sem
 * falhas — ver `fetchApiAllMenuItems`). Só então `liveMenuItems()` serve
 * para perguntas sobre "todos os pratos"; antes disso pode ter só os de um
 * restaurante (quem veio da página dele). */
let fullMenuLoadedAt = 0;

export function markFullMenuCatalog(): void {
  if (isBrowser) fullMenuLoadedAt = Date.now();
}

export function hasFreshFullMenuCatalog(maxAgeMs: number): boolean {
  return fullMenuLoadedAt > 0 && Date.now() - fullMenuLoadedAt < maxAgeMs;
}

/** Muda sempre que entram restaurantes/pratos novos — chamar no topo de um
 * componente que lê `getRestaurant()`/`getMenuItem()` etc. durante o render,
 * para ele se atualizar quando a API responder. No servidor é sempre 0. */
export function useLiveCatalogVersion(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
    () => 0,
  );
}
