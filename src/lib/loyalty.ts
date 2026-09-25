import type { Reservation } from "@/data/types";
import { customerKey } from "@/lib/customer";

/**
 * Cliente Gold de um restaurante — espelha
 * backend/app/Services/CustomerLoyaltyService.php (o servidor decide com
 * backend real; isto serve o modo demo e as contas de progresso).
 *
 * Gold = mais de 25 (26+) reservas e pedidos cumpridos, OU gasto de
 * 500.000 Kz ou mais (pedidos com taxas + cauções pagas). Por restaurante.
 */
export const GOLD_MIN_VISITS = 26;
export const GOLD_MIN_SPEND = 500_000;

export type LoyaltyTier = "gold" | "regular";

export type LoyaltyStats = {
  honoredCount: number;
  spend: number;
  tier: LoyaltyTier;
};

export function tierFor(honoredCount: number, spend: number): LoyaltyTier {
  return honoredCount >= GOLD_MIN_VISITS || spend >= GOLD_MIN_SPEND ? "gold" : "regular";
}

/** O que falta para Gold — basta UMA das duas metas. */
export function progressToGold(stats: Pick<LoyaltyStats, "honoredCount" | "spend">) {
  return {
    remainingVisits: Math.max(0, GOLD_MIN_VISITS - stats.honoredCount),
    remainingSpend: Math.max(0, GOLD_MIN_SPEND - stats.spend),
    /** 0–1, a meta mais perto de ser atingida. */
    ratio: Math.min(
      1,
      Math.max(stats.honoredCount / GOLD_MIN_VISITS, stats.spend / GOLD_MIN_SPEND),
    ),
  };
}

const HONORED_ORDER_STATUSES = new Set(["delivered", "completed"]);

type OrderLike = {
  restaurantId: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | undefined;
  ownerKey?: string | undefined;
};

function isHonoredReservation(r: Reservation, today: string): boolean {
  return r.status === "Confirmada" && r.date <= today;
}

function isPaidCaution(r: Reservation): boolean {
  return r.cautionStatus.startsWith("Paga");
}

function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Estatuto de cada cliente de UM restaurante, pela mesma chave que a
 * lista de clientes do painel usa (`customerKey`: email, senão telefone,
 * senão nome). */
export function computeRestaurantLoyalty<O extends OrderLike>(
  restaurantId: string,
  reservations: Reservation[],
  orders: O[],
  orderTotal: (o: O) => number,
  now = new Date(),
): Map<string, LoyaltyStats> {
  const today = todayIso(now);
  const acc = new Map<string, { honoredCount: number; spend: number }>();
  const add = (key: string, honored: number, spend: number) => {
    if (!key) return;
    const cur = acc.get(key) ?? { honoredCount: 0, spend: 0 };
    acc.set(key, { honoredCount: cur.honoredCount + honored, spend: cur.spend + spend });
  };

  for (const r of reservations) {
    if (r.restaurantId !== restaurantId) continue;
    const key = customerKey({
      email: r.customerEmail,
      phone: r.customerPhone,
      name: r.customerName,
    });
    add(key, isHonoredReservation(r, today) ? 1 : 0, isPaidCaution(r) ? r.cautionAmount : 0);
  }
  for (const o of orders) {
    if (o.restaurantId !== restaurantId) continue;
    const key = customerKey({
      email: o.customerEmail,
      phone: o.customerPhone,
      name: o.customerName,
    });
    const honored = HONORED_ORDER_STATUSES.has(o.status);
    add(key, honored ? 1 : 0, honored ? orderTotal(o) : 0);
  }

  return new Map(
    [...acc].map(([key, s]) => [key, { ...s, tier: tierFor(s.honoredCount, s.spend) }]),
  );
}

/** Estatuto do próprio cliente em cada restaurante (demo) — só os
 * registos dele (`ownerKey`). */
export function computeOwnLoyalty<O extends OrderLike>(
  ownerKey: string,
  reservations: Reservation[],
  orders: O[],
  orderTotal: (o: O) => number,
  now = new Date(),
): Map<string, LoyaltyStats> {
  const today = todayIso(now);
  const acc = new Map<string, { honoredCount: number; spend: number }>();
  const add = (restaurantId: string, honored: number, spend: number) => {
    const cur = acc.get(restaurantId) ?? { honoredCount: 0, spend: 0 };
    acc.set(restaurantId, {
      honoredCount: cur.honoredCount + honored,
      spend: cur.spend + spend,
    });
  };
  for (const r of reservations) {
    if (r.ownerKey !== ownerKey) continue;
    add(
      r.restaurantId,
      isHonoredReservation(r, today) ? 1 : 0,
      isPaidCaution(r) ? r.cautionAmount : 0,
    );
  }
  for (const o of orders) {
    if (o.ownerKey !== ownerKey) continue;
    const honored = HONORED_ORDER_STATUSES.has(o.status);
    add(o.restaurantId, honored ? 1 : 0, honored ? orderTotal(o) : 0);
  }
  return new Map([...acc].map(([id, s]) => [id, { ...s, tier: tierFor(s.honoredCount, s.spend) }]));
}
