import { useSyncExternalStore } from "react";

/**
 * "Estou sentado na Mesa 5 do restaurante X" — gravado ao abrir o QR de uma
 * mesa (`/q/$code`). O cartão do pedido (`order-builder-card`) usa-o para
 * começar em "No local" com a mesa já escolhida, e o pedido chega ao
 * painel com a mesa. Vale 4 horas (uma refeição longa) e só para ESSE
 * restaurante; localStorage para sobreviver ao login (Google) a meio.
 */
export type TableSession = {
  restaurantId: string;
  restaurantName: string;
  tableId: string;
  /** Como o cliente a vê: "Mesa 5" ou "Mesa 3 + Mesa 4" (junta hoje). */
  tableName: string;
  code: string;
  at: number;
};

const KEY = "luku_table_session_v1";
const EVENT = "luku:table-session";
const TTL_MS = 4 * 60 * 60 * 1000;

function read(): TableSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as TableSession;
    if (!s?.restaurantId || !s.tableId || Date.now() - s.at > TTL_MS) return null;
    return s;
  } catch {
    return null;
  }
}

let cached: TableSession | null | undefined;
let cachedRaw: string | null = null;

function snapshot(): TableSession | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (cached === undefined || raw !== cachedRaw) {
    cachedRaw = raw;
    cached = read();
  }
  return cached;
}

function emit() {
  cached = undefined;
  window.dispatchEvent(new Event(EVENT));
}

export function setTableSession(s: Omit<TableSession, "at">) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...s, at: Date.now() }));
  } catch {
    // Modo privado/sem espaço — a mesa só não fica lembrada.
  }
  emit();
}

export function clearTableSession() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignora
  }
  emit();
}

export function getTableSession(restaurantId?: string | null): TableSession | null {
  const s = read();
  return s && (!restaurantId || s.restaurantId === restaurantId) ? s : null;
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Sessão de mesa ativa para `restaurantId` (ou qualquer, sem id). */
export function useTableSession(restaurantId?: string | null): TableSession | null {
  const s = useSyncExternalStore(subscribe, snapshot, () => null);
  return s && (!restaurantId || s.restaurantId === restaurantId) ? s : null;
}
