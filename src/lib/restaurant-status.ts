import { useMemo } from "react";
import type { Restaurant } from "@/data/types";
import { useRestaurantDetail } from "@/data/use-restaurants-query";
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
 * linha. `subStatus` vem de `useSubscriptions().byRestaurant(id)?.status`
 * (mock — sempre `undefined` com backend real, esse contexto partilhado não
 * tem como saber a subscrição de restaurantes alheios a quem navega
 * `/restaurantes`). `restaurant.isSuspended` é o equivalente real, já
 * incluído no próprio recurso público do restaurante (ver
 * RestaurantResource.isSuspended no backend — só o booleano, nunca
 * plano/valores/datas de pagamento). */
export function computeRestaurantStatus(
  restaurant: Restaurant | undefined,
  subStatus: string | undefined,
  locale: Locale = "pt",
): RestaurantStatus {
  if (subStatus === "suspended" || restaurant?.isSuspended) {
    return { available: false, reason: "suspended" };
  }
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
 *
 * `useRestaurantDetail` (não `getRestaurant()` direto) — esse era só mock,
 * devolvia sempre `undefined` para um uuid real e este hook reportava
 * sempre "disponível" em modo real, independente do estado de facto (bug
 * silencioso em dish-card/order-builder-card/reservation-dialog/etc, todos
 * consumidores deste hook).
 */
export function useRestaurantStatus(restaurantId: string): RestaurantStatus {
  const { byRestaurant } = useSubscriptions();
  const { data: restaurant } = useRestaurantDetail(restaurantId || undefined);
  const { locale } = useTranslation();

  return useMemo(
    () => computeRestaurantStatus(restaurant, byRestaurant(restaurantId)?.status, locale),
    [restaurant, restaurantId, byRestaurant, locale],
  );
}
