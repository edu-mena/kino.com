import { useMemo } from "react";
import { getRestaurant } from "@/data/helpers";
import type { Restaurant } from "@/data/types";
import { useTranslation, type Locale } from "@/i18n";
import { isOpenNow, nextOpenAt } from "@/lib/opening-hours";
import { useSubscriptions } from "@/lib/subscriptions";

export type RestaurantStatusReason = "ok" | "suspended" | "paused" | "closed";

export type RestaurantStatus = {
  /** Aceita pedidos/reservas agora. */
  available: boolean;
  reason: RestaurantStatusReason;
  /** Próxima abertura, quando `reason === "closed"`. */
  opensAt?: string | undefined;
};

/** Versão pura (sem hook) — para listas onde não se pode chamar um hook por
 * linha. `subStatus` vem de `useSubscriptions().byRestaurant(id)?.status`. */
export function computeRestaurantStatus(
  restaurant: Restaurant | undefined,
  subStatus: string | undefined,
  locale: Locale = "pt",
): RestaurantStatus {
  if (subStatus === "suspended") return { available: false, reason: "suspended" };
  if (restaurant?.ordersPausedManually) return { available: false, reason: "paused" };
  if (restaurant?.hours && !isOpenNow(restaurant.hours)) {
    return { available: false, reason: "closed", opensAt: nextOpenAt(restaurant.hours, locale) };
  }
  return { available: true, reason: "ok" };
}

/**
 * Estado combinado do restaurante para o lado do cliente: subscrição
 * suspensa > pedidos pausados manualmente > fora de horário > aberto.
 * Substitui os `?.status === "suspended"` espalhados pelos componentes.
 */
export function useRestaurantStatus(restaurantId: string): RestaurantStatus {
  const { byRestaurant } = useSubscriptions();
  const { locale } = useTranslation();

  return useMemo(
    () =>
      computeRestaurantStatus(
        getRestaurant(restaurantId),
        byRestaurant(restaurantId)?.status,
        locale,
      ),

    [restaurantId, byRestaurant, locale],
  );
}
