import type { Reservation } from "@/data/types";
import { customerKey } from "@/lib/customer";

/**
 * Estatuto do cliente num restaurante, só pelo que gastou lá — espelha
 * backend/app/Services/CustomerLoyaltyService.php (o servidor decide com
 * backend real; isto serve o modo demo e as contas de progresso).
 *
 * - Gold: 500.000 Kz ou mais;
 * - Platina: acima de 1.000.000 Kz.
 * Gasto = pedidos cumpridos (com taxas) + cauções pagas. Por restaurante.
 */
export const GOLD_MIN_SPEND = 500_000;
export const PLATINUM_ABOVE_SPEND = 1_000_000;

export type LoyaltyTier = "regular" | "gold" | "platinum";

export type LoyaltyStats = {
  spend: number;
  tier: LoyaltyTier;
};

export function tierFor(spend: number): LoyaltyTier {
  if (spend > PLATINUM_ABOVE_SPEND) return "platinum";
  return spend >= GOLD_MIN_SPEND ? "gold" : "regular";
}

/** Gold ou Platina — os que têm destaque no painel. */
export function isPremiumTier(tier: LoyaltyTier | undefined): tier is "gold" | "platinum" {
  return tier === "gold" || tier === "platinum";
}

/** Próximo nível e quanto falta para lá chegar (`null` já em Platina). */
export function nextTier(
  spend: number,
): { tier: "gold" | "platinum"; remaining: number; ratio: number } | null {
  const tier = tierFor(spend);
  if (tier === "platinum") return null;
  if (tier === "gold") {
    // "Acima de" 1.000.000: falta chegar a 1.000.000 e passar por 1 Kz.
    const target = PLATINUM_ABOVE_SPEND + 1;
    return {
      tier: "platinum",
      remaining: Math.max(0, target - spend),
      ratio: Math.min(1, (spend - GOLD_MIN_SPEND) / (target - GOLD_MIN_SPEND)),
    };
  }
  return {
    tier: "gold",
    remaining: Math.max(0, GOLD_MIN_SPEND - spend),
    ratio: Math.min(1, spend / GOLD_MIN_SPEND),
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

const cautionSpend = (r: Reservation) => (r.cautionStatus.startsWith("Paga") ? r.cautionAmount : 0);

function sumByKey<O extends OrderLike>(
  reservations: Reservation[],
  orders: O[],
  orderTotal: (o: O) => number,
  keyOfReservation: (r: Reservation) => string | null,
  keyOfOrder: (o: O) => string | null,
): Map<string, LoyaltyStats> {
  const spend = new Map<string, number>();
  const add = (key: string | null, amount: number) => {
    if (!key) return;
    spend.set(key, (spend.get(key) ?? 0) + amount);
  };
  for (const r of reservations) add(keyOfReservation(r), cautionSpend(r));
  for (const o of orders) {
    add(keyOfOrder(o), HONORED_ORDER_STATUSES.has(o.status) ? orderTotal(o) : 0);
  }
  return new Map([...spend].map(([k, s]) => [k, { spend: s, tier: tierFor(s) }]));
}

/** Estatuto de cada cliente de UM restaurante, pela mesma chave que a
 * lista de clientes do painel usa (`customerKey`: email, senão telefone,
 * senão nome). */
export function computeRestaurantLoyalty<O extends OrderLike>(
  restaurantId: string,
  reservations: Reservation[],
  orders: O[],
  orderTotal: (o: O) => number,
): Map<string, LoyaltyStats> {
  return sumByKey(
    reservations,
    orders,
    orderTotal,
    (r) =>
      r.restaurantId === restaurantId
        ? customerKey({ email: r.customerEmail, phone: r.customerPhone, name: r.customerName })
        : null,
    (o) =>
      o.restaurantId === restaurantId
        ? customerKey({ email: o.customerEmail, phone: o.customerPhone, name: o.customerName })
        : null,
  );
}

/** Estatuto do próprio cliente em cada restaurante (demo) — só os
 * registos dele (`ownerKey`), por id de restaurante. */
export function computeOwnLoyalty<O extends OrderLike>(
  ownerKey: string,
  reservations: Reservation[],
  orders: O[],
  orderTotal: (o: O) => number,
): Map<string, LoyaltyStats> {
  return sumByKey(
    reservations,
    orders,
    orderTotal,
    (r) => (r.ownerKey === ownerKey ? r.restaurantId : null),
    (o) => (o.ownerKey === ownerKey ? o.restaurantId : null),
  );
}
