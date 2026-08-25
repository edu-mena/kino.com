import { INITIAL_MENU_ITEMS } from "./mockData";
import { defaultMenuId, getEffectiveMenus } from "./menus-store";
import type { MenuItem, MenuItemIngredient } from "./types";

/**
 * Camada de persistência para o CRUD de pratos do painel do restaurante
 * (`/admin/cardapio`). Funções puras e síncronas, sem React — de propósito,
 * para poderem ser chamadas também de fora de componentes (ex: dentro de
 * `loader()` de rotas como `prato.$dishId.tsx`, que corre potencialmente no
 * servidor, onde `localStorage` não existe — daí o guard `typeof window`
 * em cada leitura/escrita).
 *
 * Guarda só a "diferença" em relação ao seed (`INITIAL_MENU_ITEMS`): pratos
 * criados de raiz, edições a pratos existentes, e eliminações — a
 * disponibilidade (ligar/desligar um prato) continua na sua própria chave
 * (`kino_menu_unavailable`), já existente antes deste ficheiro.
 *
 * `getEffectiveMenuItems()` é a lista "de verdade" — o resto da app lê
 * pratos através dela (direta ou indiretamente via `@/data/helpers`),
 * nunca `INITIAL_MENU_ITEMS` diretamente, para que o que um restaurante
 * cria/edita/apaga no painel apareça em todo o lado (busca, cardápio,
 * home, página do prato).
 */

const ITEMS_KEY = "kino_menu_admin_items";
const UNAVAILABLE_KEY = "kino_menu_unavailable";

/** Disparado sempre que o estado muda — componentes que precisam de
 * reatividade (fora deste módulo puro) ouvem isto para se atualizarem. */
const CHANGE_EVENT = "kino:menu-changed";

type MenuItemEdit = Partial<Omit<MenuItem, "id" | "restaurantId">>;

type MenuAdminState = {
  customItems: MenuItem[];
  overrides: Record<string, MenuItemEdit>;
  deletedIds: string[];
};

const EMPTY_STATE: MenuAdminState = { customItems: [], overrides: {}, deletedIds: [] };

function readItemsState(): MenuAdminState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const stored = window.localStorage.getItem(ITEMS_KEY);
    return stored ? { ...EMPTY_STATE, ...JSON.parse(stored) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function writeItemsState(state: MenuAdminState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ITEMS_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readUnavailableIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(UNAVAILABLE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeUnavailableIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(UNAVAILABLE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Lista efetiva de pratos: seed + criados − eliminados, com edições,
 * cardápio e disponibilidade já aplicados.
 *
 * `activeMenusOnly` (default `true`) filtra pratos de cardápios desativados
 * — é o comportamento certo para tudo o que é voltado ao cliente (busca,
 * cardápio, home). O painel do restaurante (`useMenuAdmin`) passa `false`,
 * porque precisa de ver e editar também os pratos de cardápios ainda em
 * rascunho/desativados.
 */
export function getEffectiveMenuItems({ activeMenusOnly = true } = {}): MenuItem[] {
  const { customItems, overrides, deletedIds } = readItemsState();
  const unavailableIds = readUnavailableIds();

  const fromSeed = INITIAL_MENU_ITEMS.filter((item) => !deletedIds.includes(item.id)).map(
    (item) => ({
      ...item,
      menuId: item.menuId ?? defaultMenuId(item.restaurantId),
      ...overrides[item.id],
    }),
  );

  const merged = [...fromSeed, ...customItems].map((item) => ({
    ...item,
    isAvailable: item.isAvailable && !unavailableIds.includes(item.id),
  }));

  if (!activeMenusOnly) return merged;

  const activeMenuIds = new Set(
    getEffectiveMenus()
      .filter((m) => m.isActive)
      .map((m) => m.id),
  );
  return merged.filter((item) => item.menuId && activeMenuIds.has(item.menuId));
}

export function toggleMenuItemAvailability(id: string) {
  const ids = readUnavailableIds();
  writeUnavailableIds(ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id]);
}

export type MenuItemInput = {
  menuId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  portionInfo: string;
  prepTimeMinutes: number;
  ingredients: MenuItemIngredient[];
};

function nextIngredientId() {
  return `ing-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Normaliza os ingredientes vindos do formulário do painel: descarta linhas
 * sem nome, garante um `id` e limpa `extraPrice` de quem não é extra (evita
 * `extraPrice: 0` incoerente com `removable`/preço base). */
export function normalizeIngredients(
  ingredients: {
    id?: string | undefined;
    name: string;
    removable: boolean;
    extraPrice?: number | null | undefined;
  }[],
): MenuItemIngredient[] {
  return ingredients
    .filter((i) => i.name.trim())
    .map((i) => ({
      id: i.id ?? nextIngredientId(),
      name: i.name.trim(),
      removable: i.removable,
      ...(i.extraPrice ? { extraPrice: i.extraPrice } : {}),
    }));
}

export function createMenuItem(restaurantId: string, input: MenuItemInput): MenuItem {
  const state = readItemsState();
  const item: MenuItem = {
    id: `dish-custom-${Date.now()}`,
    restaurantId,
    isAvailable: true,
    ...input,
  };
  writeItemsState({ ...state, customItems: [...state.customItems, item] });
  return item;
}

export function updateMenuItem(id: string, input: MenuItemInput) {
  const state = readItemsState();
  // Prato criado no painel: edita o próprio item guardado. Prato do seed:
  // guarda só a diferença, em `overrides`.
  if (state.customItems.some((i) => i.id === id)) {
    writeItemsState({
      ...state,
      customItems: state.customItems.map((i) => (i.id === id ? { ...i, ...input } : i)),
    });
    return;
  }
  writeItemsState({ ...state, overrides: { ...state.overrides, [id]: input } });
}

/** Usado pela UI para bloquear a eliminação de um cardápio que ainda tenha
 * pratos — evita apagar pratos "por acidente" ao apagar o cardápio. */
export function menuHasDishes(menuId: string): boolean {
  return getEffectiveMenuItems({ activeMenusOnly: false }).some((item) => item.menuId === menuId);
}

export function deleteMenuItem(id: string) {
  const state = readItemsState();
  if (state.customItems.some((i) => i.id === id)) {
    writeItemsState({ ...state, customItems: state.customItems.filter((i) => i.id !== id) });
    return;
  }
  writeItemsState({ ...state, deletedIds: [...state.deletedIds, id] });
}
