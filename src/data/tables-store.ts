import { INITIAL_RESTAURANTS } from "./mockData";
import { safeLocalStorageSet } from "./safe-storage";

/**
 * Mesas da sala de cada restaurante — geridas em `/admin/mesas`. É o que
 * torna a reserva "de mundo real": dois clientes podem reservar a mesma
 * hora se houver mesas/lugares livres. Store pura e síncrona, segura em
 * SSR, mesmo desenho de `menus-store.ts`.
 */
export type RestaurantTable = {
  id: string;
  restaurantId: string;
  name: string;
  seats: number;
  /** Zona da sala, texto livre (ex: "Interior", "Esplanada"). */
  area?: string;
};

const KEY = "kino_restaurant_tables_v1";
const CHANGE_EVENT = "kino:menu-changed";

const SEAT_MIX = [2, 2, 4, 4, 4, 6];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** ~6–14 mesas por restaurante, determinístico a partir do id. */
export function seedTables(): RestaurantTable[] {
  const out: RestaurantTable[] = [];
  for (const r of INITIAL_RESTAURANTS) {
    const h = hash(r.id);
    const count = 6 + (h % 9); // 6..14
    const hasTerrace = h % 3 === 0;
    for (let i = 0; i < count; i += 1) {
      const seats = SEAT_MIX[(h + i * 7) % SEAT_MIX.length]!;
      const terrace = hasTerrace && i >= count - 3;
      out.push({
        id: `tbl-${r.id}-${i + 1}`,
        restaurantId: r.id,
        name: terrace ? `Esplanada ${i + 1}` : `Mesa ${i + 1}`,
        seats,
        area: terrace ? "Esplanada" : "Interior",
      });
    }
  }
  return out;
}

function read(): RestaurantTable[] {
  if (typeof window === "undefined") return seedTables();
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored ? (JSON.parse(stored) as RestaurantTable[]) : seedTables();
  } catch {
    return seedTables();
  }
}

function write(rows: RestaurantTable[]): boolean {
  if (typeof window === "undefined") return true;
  const ok = safeLocalStorageSet(KEY, JSON.stringify(rows));
  if (ok) window.dispatchEvent(new Event(CHANGE_EVENT));
  return ok;
}

export function getTables(): RestaurantTable[] {
  return read();
}

export function getTablesByRestaurant(restaurantId: string): RestaurantTable[] {
  return read()
    .filter((tbl) => tbl.restaurantId === restaurantId)
    .sort((a, b) => a.name.localeCompare(b.name, "pt", { numeric: true }));
}

export function addTable(input: Omit<RestaurantTable, "id">) {
  write([...read(), { ...input, id: `tbl-${input.restaurantId}-${Date.now()}` }]);
}

export function updateTable(
  id: string,
  patch: Partial<Omit<RestaurantTable, "id" | "restaurantId">>,
) {
  write(read().map((tbl) => (tbl.id === id ? { ...tbl, ...patch } : tbl)));
}

export function removeTable(id: string) {
  write(read().filter((tbl) => tbl.id !== id));
}
