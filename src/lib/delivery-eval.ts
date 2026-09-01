import { getRestaurant } from "@/data/helpers";
import type { CartOrder } from "@/lib/cart";

/**
 * Avaliação de entrega para o painel de Pedidos (`/admin/pedidos`).
 *
 * Não há geocodificação real — a distância é derivada de forma
 * determinística do par (morada, pedido), só para dar ao gestor um sinal
 * estável de "isto faz sentido?" antes de aceitar. O raio habitual é uma
 * constante; fora dele o painel obriga a uma confirmação extra.
 */
export const DELIVERY_RADIUS_KM = 12;
export const DELIVERY_COMFORT_KM = 7;
/** Minutos que um pedido "Novo" pode esperar antes de ser sinalizado. */
export const PENDING_SLA_MIN = 15;

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Distância estável (km, 1 casa decimal) entre restaurante e morada do pedido. */
export function orderDistanceKm(order: CartOrder): number {
  const h = hashStr(`${order.deliveryAddress.id}:${order.id}`);
  return Math.round((1.5 + (h % 1650) / 100) * 10) / 10;
}

export type DeliveryLevel = "ok" | "far" | "outOfRange";

export type DeliveryAssessment = {
  km: number;
  etaMin: number;
  level: DeliveryLevel;
  radiusKm: number;
};

export function assessDelivery(order: CartOrder): DeliveryAssessment {
  const km = orderDistanceKm(order);
  const base = getRestaurant(order.restaurantId)?.estimatedDeliveryMinutes ?? 30;
  const etaMin = Math.round(base * 0.4 + km * 4);
  const level: DeliveryLevel =
    km > DELIVERY_RADIUS_KM ? "outOfRange" : km > DELIVERY_COMFORT_KM ? "far" : "ok";
  return { km, etaMin, level, radiusKm: DELIVERY_RADIUS_KM };
}

/** Minutos decorridos desde um instante ISO (nunca negativo). */
export function minutesSince(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
}
