import { useSyncExternalStore } from "react";
import { safeLocalStorageSet } from "@/data/safe-storage";
import { STORAGE_KEYS } from "@/data/storage-keys";
import type { MenuItem } from "@/data/types";

/**
 * "Algoritmo Luku" — o que o cliente faz na app (pesquisas, pratos abertos,
 * pratos adicionados ao carrinho, categorias tocadas), guardado SÓ neste
 * aparelho (localStorage): nada disto vai para o servidor. Junta-se aos
 * pedidos (que já vivem no servidor) num perfil de gosto com decaimento —
 * um sinal vale metade ao fim de HALF_LIFE_DAYS — usado para ordenar a home
 * e o cardápio para esta pessoa (ver `@/lib/personalize`). "Limpar
 * histórico de recomendações" em Preferências apaga tudo isto.
 */

export type SignalKind = "order" | "cart" | "view" | "search" | "category";

/** Pedido feito é a prova mais forte; categoria tocada é só curiosidade. */
export const SIGNAL_WEIGHTS: Record<SignalKind, number> = {
  order: 5,
  cart: 3,
  view: 2,
  search: 2,
  category: 1,
};

export const HALF_LIFE_DAYS = 14;
const DAY_MS = 86_400_000;
/** Mais antigo do que isto já pesa < 2% — sai do armazenamento. */
const MAX_AGE_DAYS = 90;
const MAX_EVENTS = 300;
/** "fra" → "frang" → "frango" a escrever: um só sinal, o último termo. */
const SEARCH_MERGE_MS = 2 * 60_000;
const MIN_SEARCH_LENGTH = 3;

/** O essencial de um prato no momento do sinal — o prato pode sair do
 * catálogo depois, o gosto que ele revelou continua a contar. */
export type DishSnapshot = {
  category: string;
  ingredients: string[];
  restaurantId: string;
  cuisine?: string;
};

export type TasteEvent =
  | { kind: "view" | "cart"; at: number; dish: DishSnapshot }
  | { kind: "search"; at: number; query: string }
  | { kind: "category"; at: number; category: string };

export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const isBrowser = typeof window !== "undefined";
const EMPTY: TasteEvent[] = [];
let cache: TasteEvent[] | null = null;
const listeners = new Set<() => void>();

function load(): TasteEvent[] {
  if (cache) return cache;
  if (!isBrowser) return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.tasteSignals);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as TasteEvent[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function save(events: TasteEvent[], now: number): void {
  const fresh = events.filter((e) => now - e.at <= MAX_AGE_DAYS * DAY_MS).slice(-MAX_EVENTS);
  cache = fresh;
  if (isBrowser) safeLocalStorageSet(STORAGE_KEYS.tasteSignals, JSON.stringify(fresh));
  for (const listener of listeners) listener();
}

export function readTasteEvents(): TasteEvent[] {
  return load();
}

export function snapshotDish(item: MenuItem, cuisine?: string): DishSnapshot {
  return {
    category: item.category,
    ingredients: item.ingredients.map((i) => i.name),
    restaurantId: item.restaurantId,
    ...(cuisine ? { cuisine } : {}),
  };
}

export function recordDishSignal(
  kind: "view" | "cart",
  item: MenuItem,
  cuisine?: string,
  now = Date.now(),
): void {
  save([...load(), { kind, at: now, dish: snapshotDish(item, cuisine) }], now);
}

export function recordSearchSignal(query: string, now = Date.now()): void {
  const q = norm(query);
  if (q.length < MIN_SEARCH_LENGTH) return;
  const events = load();
  const last = events.at(-1);
  if (
    last?.kind === "search" &&
    now - last.at <= SEARCH_MERGE_MS &&
    (q.startsWith(last.query) || last.query.startsWith(q))
  ) {
    if (last.query === q) return;
    save([...events.slice(0, -1), { kind: "search", at: now, query: q }], now);
    return;
  }
  save([...events, { kind: "search", at: now, query: q }], now);
}

export function recordCategorySignal(category: string, now = Date.now()): void {
  if (!category) return;
  save([...load(), { kind: "category", at: now, category }], now);
}

export function clearTasteSignals(): void {
  save([], Date.now());
}

/** Os sinais deste aparelho, reativos a novos registos. No servidor (SSR)
 * é sempre a lista vazia — o HTML tem de bater com o 1º render do cliente. */
export function useTasteEvents(): TasteEvent[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load,
    () => EMPTY,
  );
}

/** Só para testes: esquece o que está em memória (volta a ler do storage). */
export function resetTasteSignalsCache(): void {
  cache = null;
}

// ---------------------------------------------------------------------------
// Perfil de gosto
// ---------------------------------------------------------------------------

export type BehaviorProfile = {
  /** Chaves normalizadas (`norm`) — pontos já com decaimento. */
  categories: Map<string, number>;
  ingredients: Map<string, number>;
  cuisines: Map<string, number>;
  /** Por id de restaurante. */
  restaurants: Map<string, number>;
  /** Peso total dos sinais (cada sinal conta uma vez, não por dimensão) —
   * 0 = cliente sem histórico. Base da confiança do perfil. */
  total: number;
};

/** Pedido do próprio cliente, no formato mínimo que o perfil precisa. */
export type ProfileOrder = {
  restaurantId: string;
  createdAt: string;
  status: string;
  lines: { menuItemId: string }[];
};

const IGNORED_ORDER_STATUSES = new Set(["rejected", "canceled"]);
/** Os ingredientes de um prato dividem-se: um prato com 10 ingredientes não
 * pode valer 10× mais do que a categoria dele. */
const INGREDIENT_SHARE = 0.5;

export function emptyProfile(): BehaviorProfile {
  return {
    categories: new Map(),
    ingredients: new Map(),
    cuisines: new Map(),
    restaurants: new Map(),
    total: 0,
  };
}

export function buildBehaviorProfile({
  events,
  orders = [],
  items = [],
  getCuisine = () => undefined,
  now = Date.now(),
}: {
  events: TasteEvent[];
  orders?: ProfileOrder[];
  /** Catálogo atual — resolve os pratos dos pedidos e as pesquisas. */
  items?: MenuItem[];
  getCuisine?: (restaurantId: string) => string | undefined;
  now?: number;
}): BehaviorProfile {
  const profile = emptyProfile();
  const add = (map: Map<string, number>, key: string | undefined, points: number) => {
    if (!key || points <= 0) return;
    map.set(key, (map.get(key) ?? 0) + points);
  };
  const decay = (at: number) => 0.5 ** (Math.max(0, now - at) / (HALF_LIFE_DAYS * DAY_MS));
  const addDish = (dish: DishSnapshot, points: number) => {
    add(profile.categories, norm(dish.category), points);
    const share = (points * INGREDIENT_SHARE) / Math.max(1, Math.sqrt(dish.ingredients.length));
    for (const ingredient of dish.ingredients) add(profile.ingredients, norm(ingredient), share);
    add(profile.cuisines, dish.cuisine ? norm(dish.cuisine) : undefined, points);
    add(profile.restaurants, dish.restaurantId, points);
  };

  for (const event of events) {
    const points = SIGNAL_WEIGHTS[event.kind] * decay(event.at);
    if (event.kind === "view" || event.kind === "cart") {
      addDish(event.dish, points);
      profile.total += points;
    } else if (event.kind === "category") {
      add(profile.categories, norm(event.category), points);
      profile.total += points;
    } else if (event.kind === "search") {
      // Pesquisa: o termo puxa as categorias dos pratos que encontra (a
      // dividir entre elas) e os ingredientes com esse nome.
      const { query } = event;
      const matches = items.filter((item) =>
        [item.name, item.category, ...item.ingredients.map((i) => i.name)].some((text) =>
          norm(text).includes(query),
        ),
      );
      if (matches.length > 0) profile.total += points;
      for (const item of matches)
        add(profile.categories, norm(item.category), points / matches.length);
      for (const item of matches) {
        for (const ingredient of item.ingredients) {
          if (norm(ingredient.name).includes(query)) {
            add(profile.ingredients, norm(ingredient.name), points / matches.length);
          }
        }
      }
    }
  }

  const itemsById = new Map(items.map((item) => [item.id, item]));
  for (const order of orders) {
    if (IGNORED_ORDER_STATUSES.has(order.status)) continue;
    const at = Date.parse(order.createdAt);
    const points = SIGNAL_WEIGHTS.order * decay(Number.isNaN(at) ? now : at);
    profile.total += points;
    const cuisine = getCuisine(order.restaurantId);
    let resolved = 0;
    for (const line of order.lines) {
      const item = itemsById.get(line.menuItemId);
      if (!item) continue;
      resolved += 1;
      addDish(snapshotDish(item, cuisine), points);
    }
    // Pratos que já não estão no catálogo: o restaurante continua a contar.
    if (resolved === 0) add(profile.restaurants, order.restaurantId, points);
  }

  return profile;
}
