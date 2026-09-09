import { safeLocalStorageSet } from "./safe-storage";

/**
 * Definições globais da plataforma, geridas pela Kino na área de sistema
 * (`/sistema/operação`). Ao contrário de `system-flags-store.ts` (que é por
 * restaurante), isto é um único registo para toda a app. Store pura e
 * síncrona, segura em SSR — pode ser lida de qualquer lado (inclusive do
 * cálculo da taxa de entrega em `@/lib/cart`).
 */

/** Regra de preço de entrega por distância. O restaurante define uma taxa
 * única (`deliveryFee` no perfil) que cobre até `freeRadiusKm`; cada km (a
 * contar por km começado) acima disso soma `perKmSurchargeKz`. */
export type DeliveryPolicy = {
  freeRadiusKm: number;
  perKmSurchargeKz: number;
};

export const DEFAULT_DELIVERY_POLICY: DeliveryPolicy = {
  freeRadiusKm: 12,
  perKmSurchargeKz: 400,
};

type PlatformSettings = {
  delivery: DeliveryPolicy;
};

const KEY = "kino_platform_settings_v1";
const CHANGE_EVENT = "kino:menu-changed";

function read(): PlatformSettings {
  if (typeof window === "undefined") return { delivery: DEFAULT_DELIVERY_POLICY };
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PlatformSettings>) : null;
    return { delivery: { ...DEFAULT_DELIVERY_POLICY, ...(parsed?.delivery ?? {}) } };
  } catch {
    return { delivery: DEFAULT_DELIVERY_POLICY };
  }
}

export function getDeliveryPolicy(): DeliveryPolicy {
  return read().delivery;
}

/** `false` = a escrita falhou (quota do localStorage). Valores saneados:
 * raio ≥ 1 km, acréscimo ≥ 0, ambos inteiros. */
export function setDeliveryPolicy(patch: Partial<DeliveryPolicy>): boolean {
  const cur = read().delivery;
  const next: PlatformSettings = {
    delivery: {
      freeRadiusKm: Math.max(1, Math.round(patch.freeRadiusKm ?? cur.freeRadiusKm)),
      perKmSurchargeKz: Math.max(0, Math.round(patch.perKmSurchargeKz ?? cur.perKmSurchargeKz)),
    },
  };
  if (typeof window === "undefined") return true;
  const ok = safeLocalStorageSet(KEY, JSON.stringify(next));
  if (ok) window.dispatchEvent(new Event(CHANGE_EVENT));
  return ok;
}

/** Taxa de entrega final de um pedido: taxa única do restaurante +
 * acréscimo por cada km começado acima do raio coberto. */
export function computeDeliveryFee(
  baseFeeKz: number,
  distanceKm: number,
  policy: DeliveryPolicy = getDeliveryPolicy(),
): number {
  const extraKm = Math.max(0, Math.ceil(distanceKm - policy.freeRadiusKm));
  return baseFeeKz + extraKm * policy.perKmSurchargeKz;
}
