import { INITIAL_RESTAURANTS } from "./mockData";
import type { RestaurantMenu } from "./types";

/**
 * Persistência dos cardápios nomeados de cada restaurante (criar, renomear,
 * ativar/desativar, apagar) — mesmo padrão de `@/data/menu-store` (funções
 * puras e síncronas, seguras em SSR via `typeof window`, para poderem ser
 * chamadas fora de componentes React).
 *
 * Todo restaurante tem sempre um cardápio "sintético" por omissão (não
 * guardado em localStorage até ser editado) — é para onde vão os pratos do
 * dataset inicial, que nunca tiveram `menuId` explícito.
 */

const MENUS_KEY = "kino_restaurant_menus";
const CHANGE_EVENT = "kino:menu-changed";

export function defaultMenuId(restaurantId: string): string {
  return `menu-default-${restaurantId}`;
}

function defaultMenuName(): string {
  return "Cardápio Principal";
}

type MenuEdit = Partial<Omit<RestaurantMenu, "id" | "restaurantId">>;

type MenusState = {
  customMenus: RestaurantMenu[];
  overrides: Record<string, MenuEdit>;
  deletedIds: string[];
};

const EMPTY_STATE: MenusState = { customMenus: [], overrides: {}, deletedIds: [] };

function readState(): MenusState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const stored = window.localStorage.getItem(MENUS_KEY);
    return stored ? { ...EMPTY_STATE, ...JSON.parse(stored) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function writeState(state: MenusState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MENUS_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function syntheticDefaultMenu(restaurantId: string): RestaurantMenu {
  return { id: defaultMenuId(restaurantId), restaurantId, name: defaultMenuName(), isActive: true };
}

/** Todos os cardápios (de todos os restaurantes) — sintético principal +
 * criados no painel, com edições aplicadas e apagados removidos. */
export function getEffectiveMenus(): RestaurantMenu[] {
  const { customMenus, overrides, deletedIds } = readState();

  const defaults = INITIAL_RESTAURANTS.map((r) => syntheticDefaultMenu(r.id)).filter(
    (m) => !deletedIds.includes(m.id),
  );

  return [...defaults, ...customMenus.filter((m) => !deletedIds.includes(m.id))].map((menu) => ({
    ...menu,
    ...overrides[menu.id],
  }));
}

export function getMenusByRestaurant(restaurantId: string): RestaurantMenu[] {
  return getEffectiveMenus().filter((m) => m.restaurantId === restaurantId);
}

export function createMenu(restaurantId: string, name: string): RestaurantMenu {
  const state = readState();
  const menu: RestaurantMenu = {
    id: `menu-custom-${Date.now()}`,
    restaurantId,
    name: name.trim() || defaultMenuName(),
    isActive: true,
  };
  writeState({ ...state, customMenus: [...state.customMenus, menu] });
  return menu;
}

export function renameMenu(id: string, name: string) {
  const state = readState();
  writeState({
    ...state,
    overrides: { ...state.overrides, [id]: { ...state.overrides[id], name } },
  });
}

export function toggleMenuActive(id: string) {
  const current = getEffectiveMenus().find((m) => m.id === id);
  if (!current) return;
  const state = readState();
  writeState({
    ...state,
    overrides: {
      ...state.overrides,
      [id]: { ...state.overrides[id], isActive: !current.isActive },
    },
  });
}

/** Recusa apagar o último cardápio de um restaurante — devolve `false`
 * nesse caso (a UI deve impedir o pedido antes, isto é a garantia final). */
export function deleteMenu(id: string): boolean {
  const state = readState();
  const menu = getEffectiveMenus().find((m) => m.id === id);
  if (!menu) return false;
  const remaining = getMenusByRestaurant(menu.restaurantId).filter((m) => m.id !== id);
  if (remaining.length === 0) return false;

  const isCustom = state.customMenus.some((m) => m.id === id);
  writeState({
    ...state,
    customMenus: isCustom ? state.customMenus.filter((m) => m.id !== id) : state.customMenus,
    deletedIds: isCustom ? state.deletedIds : [...state.deletedIds, id],
  });
  return true;
}
