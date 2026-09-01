import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import {
  createSubscription,
  extendTrial,
  getSubscriptions,
  PLAN_PRICE,
  registerPayment,
  seedSubscriptions,
  setPlan,
  setSubStatus,
  type RestaurantSubscription,
  type SubscriptionPlan,
  type SubStatus,
} from "@/data/subscriptions-store";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

const DAY = 86_400_000;

export type RestaurantAccess = {
  status: SubStatus | "unknown";
  /** Painel operacional bloqueado (subscrição suspensa). */
  locked: boolean;
  /** Operacional mas com aviso (mensalidade em atraso). */
  warning: boolean;
  /** Dias até ao fim do período grátis (só relevante em `trial`). */
  trialDaysLeft: number;
};

export function computeAccess(sub: RestaurantSubscription | undefined): RestaurantAccess {
  if (!sub) return { status: "unknown", locked: false, warning: false, trialDaysLeft: 0 };
  return {
    status: sub.status,
    locked: sub.status === "suspended",
    warning: sub.status === "overdue",
    trialDaysLeft:
      sub.status === "trial"
        ? Math.max(0, Math.ceil((Date.parse(sub.trialEndsAt) - Date.now()) / DAY))
        : 0,
  };
}

type SubscriptionsValue = {
  subscriptions: RestaurantSubscription[];
  byRestaurant: (restaurantId: string) => RestaurantSubscription | undefined;
  /** Receita recorrente mensal — soma das mensalidades das subscrições ativas. */
  mrr: number;
  counts: Record<SubStatus, number>;
  access: (restaurantId: string) => RestaurantAccess;
  setPlan: (restaurantId: string, plan: SubscriptionPlan) => void;
  setStatus: (restaurantId: string, status: SubStatus) => void;
  registerPayment: (restaurantId: string) => void;
  extendTrial: (restaurantId: string, days: number) => void;
  createSubscription: (restaurantId: string, plan?: SubscriptionPlan) => void;
};

const SubscriptionsContext = createContext<SubscriptionsValue | null>(null);

export function SubscriptionsProvider({ children }: { children: ReactNode }) {
  // SSR-safe: primeira renderização usa o seed puro; o efeito sincroniza
  // com o localStorage e volta a correr a cada `kino:menu-changed`/`storage`.
  const [tick, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    window.addEventListener("kino:menu-changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("kino:menu-changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const subscriptions = useMemo(
    () => (typeof window === "undefined" ? seedSubscriptions() : getSubscriptions()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  const value = useMemo<SubscriptionsValue>(() => {
    const counts: Record<SubStatus, number> = {
      trial: 0,
      active: 0,
      overdue: 0,
      suspended: 0,
    };
    let mrr = 0;
    for (const s of subscriptions) {
      counts[s.status] += 1;
      if (s.status === "active") mrr += PLAN_PRICE[s.plan];
    }
    return {
      subscriptions,
      byRestaurant: (restaurantId) => subscriptions.find((s) => s.restaurantId === restaurantId),
      access: (restaurantId) =>
        computeAccess(subscriptions.find((s) => s.restaurantId === restaurantId)),
      mrr,
      counts,
      setPlan,
      setStatus: setSubStatus,
      registerPayment,
      extendTrial,
      createSubscription,
    };
  }, [subscriptions]);

  return <SubscriptionsContext.Provider value={value}>{children}</SubscriptionsContext.Provider>;
}

export function useSubscriptions() {
  const ctx = useContext(SubscriptionsContext);
  if (!ctx) throw new Error("useSubscriptions must be used inside SubscriptionsProvider");
  return ctx;
}

/** Acesso do restaurante que está com sessão no painel (`/admin/*`). */
export function useRestaurantAccess(): RestaurantAccess {
  const { access } = useSubscriptions();
  const { restaurant } = useRestaurantAdmin();
  return restaurant ? access(restaurant.id) : computeAccess(undefined);
}
