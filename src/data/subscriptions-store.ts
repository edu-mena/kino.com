import { INITIAL_RESTAURANTS } from "./mockData";
import { safeLocalStorageSet } from "./safe-storage";

/**
 * Subscrições dos restaurantes na plataforma — geridas na área de sistema
 * (`/sistema/subscricoes`). Sem backend: store pura e síncrona, segura em
 * SSR, mesmo desenho de `restaurant-profile-store.ts`.
 *
 * Cada restaurante paga mensalidade — Básico 4 999 Kz, Pro 9 999 Kz — com
 * os 2 primeiros meses grátis (trial). O estado é a fonte da verdade sobre
 * MRR, trials a terminar e pagamentos em atraso.
 */
export type SubscriptionPlan = "basico" | "pro";
export type SubStatus = "trial" | "active" | "overdue" | "suspended";

export const PLAN_PRICE: Record<SubscriptionPlan, number> = { basico: 4999, pro: 9999 };
export const TRIAL_DAYS = 60;

export type RestaurantSubscription = {
  restaurantId: string;
  plan: SubscriptionPlan;
  /** ISO — quando o restaurante entrou na plataforma. */
  startedAt: string;
  /** ISO — fim dos 2 meses grátis. */
  trialEndsAt: string;
  status: SubStatus;
  /** ISO — último pagamento de mensalidade registado. */
  lastPaymentAt?: string;
};

const KEY = "kino_system_subscriptions_v1";
const CHANGE_EVENT = "kino:menu-changed";
const DAY = 86_400_000;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const iso = (ms: number) => new Date(ms).toISOString();

/** Uma subscrição por restaurante, determinística a partir do id. */
export function seedSubscriptions(): RestaurantSubscription[] {
  const now = Date.now();
  return INITIAL_RESTAURANTS.map((r, index) => {
    const h = hash(r.id);
    const monthsAgo = h % 10; // entrou há 0..9 meses
    const startedMs = now - monthsAgo * 30 * DAY;
    const trialEndsMs = startedMs + TRIAL_DAYS * DAY;
    const plan: SubscriptionPlan = h % 5 < 3 ? "basico" : "pro";

    let status: SubStatus = now < trialEndsMs ? "trial" : "active";
    if (status === "active") {
      if (index % 11 === 4) status = "overdue";
      else if (index % 17 === 6) status = "suspended";
    }
    const lastPaymentAt =
      status === "active" || status === "overdue" ? iso(now - ((h >> 3) % 40) * DAY) : undefined;

    return {
      restaurantId: r.id,
      plan,
      startedAt: iso(startedMs),
      trialEndsAt: iso(trialEndsMs),
      status,
      ...(lastPaymentAt ? { lastPaymentAt } : {}),
    };
  });
}

function read(): RestaurantSubscription[] {
  if (typeof window === "undefined") return seedSubscriptions();
  try {
    const stored = window.localStorage.getItem(KEY);
    if (!stored) return seedSubscriptions();
    const parsed = JSON.parse(stored) as RestaurantSubscription[];
    // garante uma linha por restaurante mesmo que o seed cresça
    const known = new Set(parsed.map((s) => s.restaurantId));
    const extra = seedSubscriptions().filter((s) => !known.has(s.restaurantId));
    return [...parsed, ...extra];
  } catch {
    return seedSubscriptions();
  }
}

function write(rows: RestaurantSubscription[]): boolean {
  if (typeof window === "undefined") return true;
  const ok = safeLocalStorageSet(KEY, JSON.stringify(rows));
  if (ok) window.dispatchEvent(new Event(CHANGE_EVENT));
  return ok;
}

export function getSubscriptions(): RestaurantSubscription[] {
  return read();
}

/** Cria a subscrição de um restaurante novo (aprovação de candidatura) —
 * começa em período grátis de 2 meses. */
export function createSubscription(
  restaurantId: string,
  plan: SubscriptionPlan = "basico",
): RestaurantSubscription {
  const now = Date.now();
  const sub: RestaurantSubscription = {
    restaurantId,
    plan,
    startedAt: iso(now),
    trialEndsAt: iso(now + TRIAL_DAYS * DAY),
    status: "trial",
  };
  const rows = read().filter((s) => s.restaurantId !== restaurantId);
  write([...rows, sub]);
  return sub;
}

function patch(restaurantId: string, fn: (s: RestaurantSubscription) => RestaurantSubscription) {
  write(read().map((s) => (s.restaurantId === restaurantId ? fn(s) : s)));
}

export function setPlan(restaurantId: string, plan: SubscriptionPlan) {
  patch(restaurantId, (s) => ({ ...s, plan }));
}

export function setSubStatus(restaurantId: string, status: SubStatus) {
  patch(restaurantId, (s) => ({ ...s, status }));
}

export function registerPayment(restaurantId: string) {
  patch(restaurantId, (s) => ({
    ...s,
    lastPaymentAt: new Date().toISOString(),
    status: s.status === "suspended" ? "suspended" : "active",
  }));
}

export function extendTrial(restaurantId: string, days: number) {
  patch(restaurantId, (s) => {
    const base = Math.max(Date.parse(s.trialEndsAt), Date.now());
    return { ...s, trialEndsAt: iso(base + days * DAY), status: "trial" };
  });
}
