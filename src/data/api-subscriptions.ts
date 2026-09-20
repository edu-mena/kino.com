import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import {
  PLAN_PRICE,
  type RestaurantSubscription,
  type SubscriptionPlan,
  type SubStatus,
} from "./subscriptions-store";

/**
 * Subscrições reais (backend/app/Http/Controllers/Api/V1/SubscriptionController.php)
 * — só usado no painel de sistema (`/sistema/subscricoes`, `/sistema/`),
 * área system_operator-only tanto no backend (`GET /subscriptions` e as
 * ações abaixo abortam 403 para qualquer outra role) como aqui: quem chama
 * isto usa sempre o token de `useSystemAdmin()`, nunca o de
 * `useRestaurantAdmin`/`useAuth`. O contexto partilhado `useSubscriptions()`
 * (`@/lib/subscriptions`) continua mock-only — é montado na raiz e também
 * serve páginas de cliente/restaurante, que a API real não expõe estado de
 * subscrição de outro restaurante para elas.
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
