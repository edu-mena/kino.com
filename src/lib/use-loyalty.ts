import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchApiOwnLoyalty,
  fetchApiRestaurantLoyalty,
  type ApiCustomerLoyalty,
} from "@/data/api-loyalty";
import { hasRealBackend } from "@/lib/api-client";
import { getAuthToken, useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { customerKey, viewerKey } from "@/lib/customer";
import { computeOwnLoyalty, computeRestaurantLoyalty, type LoyaltyStats } from "@/lib/loyalty";
import { useReservations } from "@/lib/reservations";
import { getAdminToken } from "@/lib/restaurant-admin";

type CustomerRef = {
  email?: string | undefined;
  phone?: string | undefined;
  name?: string | undefined;
};

/**
 * Estatuto (Gold ou não) de cada cliente do restaurante gerido — para o
 * painel. Com backend real vem do servidor (a regra vive lá, ver
 * CustomerLoyaltyService); na demo, calculado dos pedidos/reservas locais.
 * Devolve uma função de consulta por email/telefone/nome.
 */
export function useRestaurantLoyalty(restaurantId: string | undefined) {
  const { reservations } = useReservations();
  const { orders, orderTotal } = useCart();
  const [apiRows, setApiRows] = useState<ApiCustomerLoyalty[]>([]);
  // Refaz a consulta quando entram/mudam registos (ex.: reserva confirmada).
  const signature = useMemo(
    () =>
      reservations.map((r) => `${r.id}:${r.status}`).join("|") +
      orders.map((o) => `${o.id}:${o.status}`).join("|"),
    [reservations, orders],
  );

  useEffect(() => {
    if (!hasRealBackend || !restaurantId) return;
    const token = getAdminToken();
    if (!token) return;
    let cancelled = false;
    fetchApiRestaurantLoyalty(restaurantId, token)
      .then((rows) => {
        if (!cancelled) setApiRows(rows);
      })
      .catch(() => {
        // best-effort — sem selos até à próxima tentativa
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, signature]);

  const mockMap = useMemo(
    () =>
      !hasRealBackend && restaurantId
        ? computeRestaurantLoyalty(restaurantId, reservations, orders, orderTotal)
        : new Map<string, LoyaltyStats>(),
    [restaurantId, reservations, orders, orderTotal],
  );

  const apiIndex = useMemo(() => {
    const byEmail = new Map<string, LoyaltyStats>();
    const byPhone = new Map<string, LoyaltyStats>();
    for (const r of apiRows) {
      const stats = { honoredCount: r.honoredCount, spend: r.spend, tier: r.tier };
      if (r.email) byEmail.set(r.email.toLowerCase(), stats);
      if (r.phone) byPhone.set(r.phone, stats);
    }
    return { byEmail, byPhone };
  }, [apiRows]);

  return useCallback(
    (c: CustomerRef): LoyaltyStats | undefined => {
      if (!hasRealBackend) return mockMap.get(customerKey(c));
      return (
        (c.email ? apiIndex.byEmail.get(c.email.toLowerCase()) : undefined) ??
        (c.phone ? apiIndex.byPhone.get(c.phone) : undefined)
      );
    },
    [mockMap, apiIndex],
  );
}

/** Estatuto do próprio cliente em cada restaurante (id → stats). */
export function useOwnLoyalty(): Map<string, LoyaltyStats> {
  const { user, isLoggedIn } = useAuth();
  const { reservations } = useReservations();
  const { orders, orderTotal } = useCart();
  const [apiMap, setApiMap] = useState<Map<string, LoyaltyStats>>(new Map());

  useEffect(() => {
    if (!hasRealBackend) return;
    const token = getAuthToken();
    if (!isLoggedIn || !token) {
      setApiMap(new Map());
      return;
    }
    let cancelled = false;
    fetchApiOwnLoyalty(token)
      .then((rows) => {
        if (cancelled) return;
        setApiMap(
          new Map(
            rows.map((r) => [
              r.restaurantId,
              { honoredCount: r.honoredCount, spend: r.spend, tier: r.tier },
            ]),
          ),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id, reservations.length, orders.length]);

  const mockMap = useMemo(
    () =>
      !hasRealBackend && isLoggedIn
        ? computeOwnLoyalty(viewerKey(user), reservations, orders, orderTotal)
        : new Map<string, LoyaltyStats>(),
    [isLoggedIn, user, reservations, orders, orderTotal],
  );

  return hasRealBackend ? apiMap : mockMap;
}
