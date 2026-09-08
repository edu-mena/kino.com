import type { CartOrder } from "@/lib/cart";

export type DeliveryEstimate = {
  /** Minutos, arredondados a múltiplos de 5. */
  minutes: number;
  /** `true` se veio do histórico de entregas; `false` = valor configurado. */
  basedOnHistory: boolean;
  /** Nº de entregas usadas no cálculo. */
  sampleCount: number;
};

const MIN_SAMPLES = 3;
/** Ignora durações absurdas (dados corrompidos, pedidos reabertos, etc.). */
const MAX_PLAUSIBLE_MIN = 240;

const durationMin = (o: CartOrder) =>
  (Date.parse(o.deliveredAt as string) - Date.parse(o.createdAt)) / 60_000;

/**
 * Estimativa de tempo de entrega de um restaurante a partir das entregas já
 * concluídas (`status === "delivered"` com `deliveredAt`). Se `atDate` for
 * dado e houver amostras suficientes na mesma faixa horária (±1h), usa só
 * essas — a hora do dia pesa muito no tempo real. Sem histórico suficiente,
 * devolve `fallbackMinutes` (o valor configurado no perfil).
 */
export function estimateDeliveryMinutes(
  orders: CartOrder[],
  restaurantId: string,
  fallbackMinutes: number,
  atDate?: Date,
): DeliveryEstimate {
  const delivered = orders.filter(
    (o) => o.restaurantId === restaurantId && o.status === "delivered" && o.deliveredAt,
  );
  const all = delivered
    .map((o) => ({ order: o, min: durationMin(o) }))
    .filter((x) => x.min > 0 && x.min < MAX_PLAUSIBLE_MIN);

  let sample = all;
  if (atDate) {
    const hour = atDate.getHours();
    const sameHour = all.filter((x) => {
      const h = new Date(x.order.createdAt).getHours();
      return Math.abs(h - hour) <= 1 || Math.abs(h - hour) >= 23;
    });
    if (sameHour.length >= MIN_SAMPLES) sample = sameHour;
  }

  if (sample.length < MIN_SAMPLES) {
    return { minutes: fallbackMinutes, basedOnHistory: false, sampleCount: sample.length };
  }

  const avg = sample.reduce((s, x) => s + x.min, 0) / sample.length;
  return {
    minutes: Math.max(10, Math.round(avg / 5) * 5),
    basedOnHistory: true,
    sampleCount: sample.length,
  };
}
