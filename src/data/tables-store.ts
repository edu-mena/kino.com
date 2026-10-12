import { hasRealBackend } from "@/lib/api-client";
import { INITIAL_RESTAURANTS } from "./mockData";
import { safeLocalStorageSet } from "./safe-storage";

/**
 * Mesas da sala de cada restaurante — geridas em `/admin/mesas`. É o que
 * torna a reserva "de mundo real": dois clientes podem reservar a mesma
 * hora se houver mesas/lugares livres. Store pura e síncrona, segura em
 * SSR, mesmo desenho de `menus-store.ts`.
 *
 * Com backend real tudo isto vive na API (ver `@/data/api-tables`); o que
 * está aqui é o modo de demonstração (localStorage).
 */

/** Forma da mesa na planta da sala. */
export type TableShape = "square" | "round" | "rectangle" | "booth" | "high";
export const TABLE_SHAPES: TableShape[] = ["square", "round", "rectangle", "booth", "high"];

/** Características pré-definidas — o texto livre fica em `description`.
 * Alinhado com `RestaurantTable::FEATURES` no backend. */
export type TableFeature =
  | "fixed_seats"
  | "sofa"
  | "window"
  | "outdoor"
  | "accessible"
  | "baby_chair"
  | "power_outlet"
  | "private"
  | "view"
  | "quiet"
  | "smoking";
export const TABLE_FEATURES: TableFeature[] = [
  "fixed_seats",
  "sofa",
  "window",
  "outdoor",
  "accessible",
  "baby_chair",
  "power_outlet",
  "private",
  "view",
  "quiet",
  "smoking",
];

export type TableQrInfo = {
  /** Código curto do QR impresso — `luku.ao/q/{code}`. */
  code: string;
  scans: number;
  lastScannedAt?: string;
};

export type RestaurantTable = {
  id: string;
  restaurantId: string;
  name: string;
  seats: number;
  /** Zona da sala, texto livre (ex: "Interior", "Esplanada"). */
  area?: string;
  /** Texto livre — ex.: "Cadeiras fixas, encostada à janela". */
  description?: string;
  features?: TableFeature[];
  /** Ausente = "square". */
  shape?: TableShape;
  /** Pode ser junta a outras (ausente = sim). Mesas com cadeiras fixas ou
   * sofás normalmente não. */
  isCombinable?: boolean;
  /** Em serviço (ausente = sim). Fora de serviço não conta para a lotação
   * nem aparece na sala do dia. */
  isActive?: boolean;
  sortOrder?: number;
  qr?: TableQrInfo;
};

/** Mesas juntas num dia — ver `TableCombination` no backend. A 1.ª mesa de
 * `tableIds` é a âncora: uma reserva atribuída à junção fica gravada nela. */
export type TableCombination = {
  id: string;
  restaurantId: string;
  /** YYYY-MM-DD */
  date: string;
  tableIds: string[];
  seats: number;
  label?: string;
};

export type TableInput = Omit<RestaurantTable, "id" | "qr" | "sortOrder">;
export type TablePatch = Partial<Omit<RestaurantTable, "id" | "restaurantId" | "qr">>;

const KEY = "luku_restaurant_tables_v1";
const COMBOS_KEY = "luku_table_combinations_v1";
const CHANGE_EVENT = "luku:menu-changed";

const SEAT_MIX = [2, 2, 4, 4, 4, 6];
const SHAPE_FOR_SEATS: Record<number, TableShape> = { 2: "round", 4: "square", 6: "rectangle" };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const QR_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Código QR determinístico do modo demo (o backend gera-os aleatórios). */
export function mockQrCode(seed: string): string {
  let h = hash(`qr:${seed}`);
  let out = "";
  for (let i = 0; i < 7; i += 1) {
    out += QR_ALPHABET[h % QR_ALPHABET.length];
    h = Math.floor(h / QR_ALPHABET.length) ^ hash(`${seed}:${i}`);
  }
  return out;
}

/** ~6–14 mesas por restaurante, determinístico a partir do id. */
export function seedTables(): RestaurantTable[] {
  // Com backend real, mesas nascem de verdade na aprovação do restaurante
  // (ver backend/app/Actions/ApprovePartnerApplication.php) — sem seed
  // fictícia aqui por cima.
  if (hasRealBackend) return [];
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
        shape: SHAPE_FOR_SEATS[seats] ?? "square",
        sortOrder: i + 1,
      });
    }
  }
  return out;
}

function withQr(tbl: RestaurantTable): RestaurantTable {
  return tbl.qr ? tbl : { ...tbl, qr: { code: mockQrCode(tbl.id), scans: 0 } };
}

function read(): RestaurantTable[] {
  if (typeof window === "undefined") return seedTables().map(withQr);
  try {
    const stored = window.localStorage.getItem(KEY);
    return (stored ? (JSON.parse(stored) as RestaurantTable[]) : seedTables()).map(withQr);
  } catch {
    return seedTables().map(withQr);
  }
}

function write(rows: RestaurantTable[]): boolean {
  if (typeof window === "undefined") return true;
  const ok = safeLocalStorageSet(KEY, JSON.stringify(rows));
  if (ok) window.dispatchEvent(new Event(CHANGE_EVENT));
  return ok;
}

/** Ordem da sala: manual (`sortOrder`), depois nome "natural" (Mesa 2 antes
 * de Mesa 10). */
export function compareTables(a: RestaurantTable, b: RestaurantTable): number {
  const byOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  return byOrder !== 0 ? byOrder : a.name.localeCompare(b.name, "pt", { numeric: true });
}

export function getTables(): RestaurantTable[] {
  return read();
}

export function getTablesByRestaurant(restaurantId: string): RestaurantTable[] {
  return read()
    .filter((tbl) => tbl.restaurantId === restaurantId)
    .sort(compareTables);
}

function nextSortOrder(rows: RestaurantTable[], restaurantId: string): number {
  return (
    rows
      .filter((t) => t.restaurantId === restaurantId)
      .reduce((max, t) => Math.max(max, t.sortOrder ?? 0), 0) + 1
  );
}

export function addTable(input: TableInput): RestaurantTable {
  const rows = read();
  const id = `tbl-${input.restaurantId}-${Date.now()}-${Math.round(Math.random() * 1e4)}`;
  const table: RestaurantTable = withQr({
    ...input,
    id,
    sortOrder: nextSortOrder(rows, input.restaurantId),
  });
  write([...rows, table]);
  return table;
}

export function addTablesBulk(
  restaurantId: string,
  spec: {
    prefix: string;
    start: number;
    count: number;
    seats: number;
    area?: string;
    shape?: TableShape;
  },
): RestaurantTable[] {
  const rows = read();
  const existing = new Set(
    rows.filter((t) => t.restaurantId === restaurantId).map((t) => t.name.trim().toLowerCase()),
  );
  let order = nextSortOrder(rows, restaurantId);
  const created: RestaurantTable[] = [];
  for (let i = 0; i < spec.count; i += 1) {
    const name = `${spec.prefix.trim()} ${spec.start + i}`;
    if (existing.has(name.toLowerCase())) continue;
    created.push(
      withQr({
        id: `tbl-${restaurantId}-${Date.now()}-${i}`,
        restaurantId,
        name,
        seats: spec.seats,
        ...(spec.area ? { area: spec.area } : {}),
        shape: spec.shape ?? "square",
        sortOrder: order++,
      }),
    );
  }
  write([...rows, ...created]);
  return created;
}

export function updateTable(id: string, patch: TablePatch) {
  write(read().map((tbl) => (tbl.id === id ? { ...tbl, ...patch } : tbl)));
  // Mesma regra do backend: quem deixa de poder ser junta (ou sai de
  // serviço) sai das junções de hoje em diante.
  if (patch.isCombinable === false || patch.isActive === false) {
    const today = new Date().toISOString().slice(0, 10);
    writeCombos(
      readCombos()
        .map((c) =>
          c.date >= today && c.tableIds.includes(id)
            ? { ...c, tableIds: c.tableIds.filter((t) => t !== id) }
            : c,
        )
        .filter((c) => c.tableIds.length >= 2),
    );
  }
}

export function reorderTables(restaurantId: string, ids: string[]) {
  const pos = new Map(ids.map((id, i) => [id, i + 1]));
  const rows = read();
  const rest = rows
    .filter((t) => t.restaurantId === restaurantId && !pos.has(t.id))
    .sort(compareTables);
  rest.forEach((t, i) => pos.set(t.id, ids.length + i + 1));
  write(
    rows.map((t) =>
      t.restaurantId === restaurantId ? { ...t, sortOrder: pos.get(t.id) ?? 0 } : t,
    ),
  );
}

export function removeTable(id: string) {
  write(read().filter((tbl) => tbl.id !== id));
  writeCombos(
    readCombos()
      .map((c) => ({ ...c, tableIds: c.tableIds.filter((t) => t !== id) }))
      .filter((c) => c.tableIds.length >= 2),
  );
}

// ── Junções (modo demo) ──────────────────────────────────────────────────

function readCombos(): TableCombination[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(COMBOS_KEY);
    return stored ? (JSON.parse(stored) as TableCombination[]) : [];
  } catch {
    return [];
  }
}

function writeCombos(rows: TableCombination[]): boolean {
  if (typeof window === "undefined") return true;
  const ok = safeLocalStorageSet(COMBOS_KEY, JSON.stringify(rows));
  if (ok) window.dispatchEvent(new Event(CHANGE_EVENT));
  return ok;
}

export function getCombinations(restaurantId: string): TableCombination[] {
  return readCombos().filter((c) => c.restaurantId === restaurantId);
}

export function addCombination(input: Omit<TableCombination, "id">): TableCombination {
  const combo = { ...input, id: `combo-${Date.now()}-${Math.round(Math.random() * 1e4)}` };
  writeCombos([...readCombos(), combo]);
  return combo;
}

export function updateCombination(
  id: string,
  patch: Partial<Pick<TableCombination, "seats" | "label" | "tableIds">>,
) {
  writeCombos(readCombos().map((c) => (c.id === id ? { ...c, ...patch } : c)));
}

export function removeCombination(id: string) {
  writeCombos(readCombos().filter((c) => c.id !== id));
}

/** Resolve um código QR no modo demo (o backend faz isto em `GET /qr/{code}`). */
export function resolveMockQr(
  code: string,
): { restaurantId: string; table: RestaurantTable | null } | null {
  const normalized = code.toUpperCase();
  const table = read().find((t) => t.qr?.code === normalized);
  if (table) return { restaurantId: table.restaurantId, table };
  const restaurant = INITIAL_RESTAURANTS.find(
    (r) => mockQrCode(`restaurant:${r.id}`) === normalized,
  );
  return restaurant ? { restaurantId: restaurant.id, table: null } : null;
}
