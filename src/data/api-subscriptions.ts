import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { getAdminToken } from "@/lib/restaurant-admin";
import {
  PLAN_PRICE,
  type RestaurantSubscription,
  type SubscriptionPlan,
  type SubStatus,
} from "./subscriptions-store";

/**
 * Subscrições reais (backend/app/Http/Controllers/Api/V1/SubscriptionController.php).
 * `GET /subscriptions` (lista agregada) e as ações de billing
 * (status/register-payment/extend-trial) são system_operator-only no
 * backend — usadas pelo painel de sistema via `useSystemSubscriptions`
 * abaixo, sempre com o token de `useSystemAdmin()`.
 *
 * `GET /restaurants/{id}/subscription` (uma só, ver
 * `fetchApiRestaurantSubscription`) já é diferente: acessível também ao
 * PRÓPRIO restaurante (`manageOperations`), não só a system_operator — é o
 * que `SubscriptionsProvider` (`@/lib/subscriptions`, montado na raiz) usa
 * para mostrar a subscrição real no painel `/admin` (banner de bloqueio,
 * `/admin/subscricao`, cartão no dashboard). Continua sem dar nada a
 * clientes/páginas públicas (`hasRealBackend` sem sessão de admin) — a API
 * não expõe subscrição de restaurante a quem não o gere.
 */
type ApiSubscription = {
  restaurantId: string;
  plan: SubscriptionPlan;
  startedAt: string;
  trialEndsAt: string;
  status: SubStatus;
  lastPaymentAt: string | null;
  locked: boolean;
  trialDaysLeft: number;
};

function mapApiSubscription(s: ApiSubscription): RestaurantSubscription {
  return {
    restaurantId: s.restaurantId,
    plan: s.plan,
    startedAt: s.startedAt,
    trialEndsAt: s.trialEndsAt,
    status: s.status,
    ...(s.lastPaymentAt ? { lastPaymentAt: s.lastPaymentAt } : {}),
  };
}

export async function fetchApiSubscriptions(token: string): Promise<RestaurantSubscription[]> {
  const { data } = await apiFetch<{ data: ApiSubscription[] }>("/subscriptions", { token });
  return data.map(mapApiSubscription);
}

/** A subscrição de UM restaurante — o próprio dono/staff (`manageOperations`)
 * também pode ver isto, ao contrário da lista agregada acima. Usado por
 * `SubscriptionsProvider` para o painel `/admin` (ver módulo). */
export async function fetchApiRestaurantSubscription(
  restaurantId: string,
  token: string,
): Promise<RestaurantSubscription> {
  const { data } = await apiFetch<{ data: ApiSubscription }>(
    `/restaurants/${restaurantId}/subscription`,
    { token },
  );
  return mapApiSubscription(data);
}

export async function setApiSubscriptionStatus(
  restaurantId: string,
  status: SubStatus,
  token: string,
): Promise<RestaurantSubscription> {
  const { data } = await apiFetch<{ data: ApiSubscription }>(
    `/restaurants/${restaurantId}/subscription`,
    { method: "PATCH", token, body: { status } },
  );
  return mapApiSubscription(data);
}

export async function registerApiSubscriptionPayment(
  restaurantId: string,
  token: string,
): Promise<RestaurantSubscription> {
  const { data } = await apiFetch<{ data: ApiSubscription }>(
    `/restaurants/${restaurantId}/subscription/register-payment`,
    { method: "POST", token },
  );
  return mapApiSubscription(data);
}

export async function extendApiSubscriptionTrial(
  restaurantId: string,
  days: number,
  token: string,
): Promise<RestaurantSubscription> {
  const { data } = await apiFetch<{ data: ApiSubscription }>(
    `/restaurants/${restaurantId}/subscription/extend-trial`,
    { method: "POST", token, body: { days } },
  );
  return mapApiSubscription(data);
}

/** KPI "Clientes registados" do painel de sistema (`/sistema/`) — ver
 * backend/app/Http/Controllers/Api/V1/SystemStatsController. */
export async function fetchApiCustomersCount(token: string): Promise<number> {
  const { data } = await apiFetch<{ data: { count: number } }>("/system/customers-count", {
    token,
  });
  return data.count;
}

/** Consumido por `sistema.subscricoes.tsx`/`sistema.index.tsx` — os únicos
 * dois pontos do painel de sistema que precisam da lista agregada. Recebe o
 * token de `useSystemAdmin()` (o próprio chamador decide isso, `null`
 * enquanto a sessão ainda não hidratou não dispara pedido nenhum). */
export function useSystemSubscriptions(token: string | null) {
  const [subscriptions, setSubscriptions] = useState<RestaurantSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!token) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchApiSubscriptions(token)
      .then(setSubscriptions)
      .catch(() => setSubscriptions([]))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const { mrr, counts } = useMemo(() => {
    const c: Record<SubStatus, number> = { trial: 0, active: 0, overdue: 0, suspended: 0 };
    let sum = 0;
    for (const s of subscriptions) {
      c[s.status] += 1;
      if (s.status === "active") sum += PLAN_PRICE[s.plan];
    }
    return { mrr: sum, counts: c };
  }, [subscriptions]);

  return {
    subscriptions,
    mrr,
    counts,
    loading,
    byRestaurant: (restaurantId: string) =>
      subscriptions.find((s) => s.restaurantId === restaurantId),
    setStatus: (restaurantId: string, status: SubStatus) => {
      if (!token) return;
      void setApiSubscriptionStatus(restaurantId, status, token).then(refetch);
    },
    registerPayment: (restaurantId: string) => {
      if (!token) return;
      void registerApiSubscriptionPayment(restaurantId, token).then(refetch);
    },
    extendTrial: (restaurantId: string, days: number) => {
      if (!token) return;
      void extendApiSubscriptionTrial(restaurantId, days, token).then(refetch);
    },
  };
}

/** A subscrição do PRÓPRIO restaurante — usado dentro de `/admin/*` (banner
 * de bloqueio, `/admin/subscricao`, cartão no dashboard), com o token de
 * `getAdminToken()` (o mesmo do painel, não o de `useSystemAdmin()`). Só
 * dispara o pedido quando `restaurantId` é dado — os chamadores passam
 * `undefined` fora de `hasRealBackend` (ver `useRestaurantAccess` em
 * `@/lib/subscriptions`). */
export function useOwnRestaurantSubscription(restaurantId: string | undefined) {
  const [sub, setSub] = useState<RestaurantSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    const token = getAdminToken();
    if (!restaurantId || !token) {
      setSub(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchApiRestaurantSubscription(restaurantId, token)
      .then(setSub)
      .catch(() => setSub(null))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { sub, loading, refetch };
}
