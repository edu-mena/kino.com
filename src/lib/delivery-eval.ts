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

/** Distância estável (km, 1 casa decimal) entre um restaurante e uma morada
 * guardada — sem geocodificação real, derivada de forma determinística do
 * par (restaurante, morada). Mesma morada e mesmo restaurante dão sempre o
 * mesmo valor, para a estimativa da taxa antes do pedido bater certo com a
 * cobrada depois. Alcance ~1.5–18 km. */
export function addressDistanceKm(
  restaurantId: string,
  address: { id?: string | undefined },
): number {
  const h = hashStr(`${restaurantId}:${address.id ?? "sem-morada"}`);
  return Math.round((1.5 + (h % 1650) / 100) * 10) / 10;
}

/** Distância estável (km, 1 casa decimal) entre restaurante e morada do
 * pedido. Só faz sentido em `fulfillmentType === "delivery"`; sem morada
 * cai no id do pedido, mantendo o valor determinístico. */
export function orderDistanceKm(order: CartOrder): number {
  if (order.deliveryAddress) return addressDistanceKm(order.restaurantId, order.deliveryAddress);
  const h = hashStr(`${order.id}:${order.id}`);
  return Math.round((1.5 + (h % 1650) / 100) * 10) / 10;
}

/** Distância "real" de um restaurante pro usuário: a partir da morada
 * selecionada no chip do header (`useLocation`), quando houver — senão cai
 * no `distanceKm` estático da seed (melhor do que nada). Usada para ordenar
 * listagens de restaurantes/pratos "perto de si" pela localização de quem
 * está a ver, não por um número fixo igual pra toda a gente. */
export function personalizedRestaurantDistanceKm(
  restaurantId: string,
  address: { id?: string | undefined } | undefined,
  fallbackKm: number,
): number {
  return address ? addressDistanceKm(restaurantId, address) : fallbackKm;
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
