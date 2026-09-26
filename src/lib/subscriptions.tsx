import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { useOwnRestaurantSubscription } from "@/data/api-subscriptions";
import {
  createSubscription,
  extendTrial,
  getSubscriptions,
  PLAN_PRICE,
  registerPayment,
  seedSubscriptions,
  setPlan,
  setSubStatus,
  type PlanFeatureFlags,
  type PlanLimits,
  type PlanUsage,
  type RestaurantSubscription,
  type SubscriptionPlan,
  type SubStatus,
} from "@/data/subscriptions-store";
import { hasRealBackend } from "@/lib/api-client";
import { useOffersAdmin } from "@/lib/offers-admin";
import { useReservations } from "@/lib/reservations";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useStoriesAdmin } from "@/lib/stories-admin";

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
  // com o localStorage e volta a correr a cada `luku:menu-changed`/`storage`.
  const [tick, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    window.addEventListener("luku:menu-changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("luku:menu-changed", bump);
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

/** Acesso do restaurante que está com sessão no painel (`/admin/*`). Com
 * backend real, lê a subscrição verdadeira via `useOwnRestaurantSubscription`
 * (endpoint `GET /restaurants/{id}/subscription`, acessível ao próprio
 * restaurante) — o contexto partilhado (`useSubscriptions`) fica mock-only,
 * não dá para o alcançar dali (ver `@/data/api-subscriptions`). */
export function useRestaurantAccess(): RestaurantAccess {
  const { access } = useSubscriptions();
  const { restaurant } = useRestaurantAdmin();
  const real = useOwnRestaurantSubscription(hasRealBackend ? restaurant?.id : undefined);
  if (hasRealBackend) return computeAccess(real.sub ?? undefined);
  return restaurant ? access(restaurant.id) : computeAccess(undefined);
}

export type CountedFeature = keyof PlanLimits;
export type FlagFeature = keyof PlanFeatureFlags;

export type PlanFeatures = {
  plan: SubscriptionPlan | "unknown";
  price: number;
  limits: PlanLimits;
  usage: PlanUsage;
  hasCapacity: (feature: CountedFeature) => boolean;
  allows: (feature: FlagFeature) => boolean;
};

const UNKNOWN_LIMITS: PlanLimits = { stories: 0, offers: 0, reservationsPerMonth: 0 };
const UNKNOWN_USAGE: PlanUsage = { stories: 0, offers: 0, reservationsPerMonth: 0 };
const UNKNOWN_FEATURES: PlanFeatureFlags = { packages: false, customers: false, stats: false };

/**
 * Tier de plano (Pro/Plus) — eixo independente de `useRestaurantAccess`
 * (esse é status de pagamento: trial/atraso/suspensa). Espelha
 * `PlanLimitService` do backend: no backend real lê os números já
 * resolvidos em `SubscriptionResource`; em mock, calcula a partir dos
 * mesmos stores que os ecrãs de Stories/Promoções/Reservas já usam — nunca
 * um segundo conceito de "ativo"/"este mês".
 */
export function usePlanFeatures(): PlanFeatures {
  const { restaurant } = useRestaurantAdmin();
  const real = useOwnRestaurantSubscription(hasRealBackend ? restaurant?.id : undefined);
  const { byRestaurant } = useSubscriptions();
  const { storiesByRestaurant } = useStoriesAdmin();
  const { offersByRestaurant } = useOffersAdmin();
  const { reservations } = useReservations();

  return useMemo<PlanFeatures>(() => {
    if (hasRealBackend) {
      const sub = real.sub;
      if (!sub) {
        return {
          plan: "unknown",
          price: 0,
          limits: UNKNOWN_LIMITS,
          usage: UNKNOWN_USAGE,
          hasCapacity: () => false,
          allows: () => false,
        };
      }
      return {
        plan: sub.plan,
        price: sub.price,
        limits: sub.limits,
        usage: sub.usage,
        hasCapacity: (feature) => {
          const limit = sub.limits[feature];
          return limit === null || sub.usage[feature] < limit;
        },
        allows: (feature) => sub.features[feature],
      };
    }

    if (!restaurant) {
      return {
        plan: "unknown",
        price: 0,
        limits: UNKNOWN_LIMITS,
        usage: UNKNOWN_USAGE,
        hasCapacity: () => false,
        allows: () => false,
      };
    }

    const sub = byRestaurant(restaurant.id);
    const plan: SubscriptionPlan = sub?.plan ?? "pro";
    const limits: PlanLimits = {
      stories: plan === "plus" ? null : 2,
      offers: plan === "plus" ? null : 2,
      reservationsPerMonth: plan === "plus" ? null : 20,
    };
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const usage: PlanUsage = {
      stories: storiesByRestaurant(restaurant.id).length,
      offers: offersByRestaurant(restaurant.id).length,
      reservationsPerMonth: reservations.filter(
        (r) => r.restaurantId === restaurant.id && r.date.startsWith(monthPrefix),
      ).length,
    };
    const features: PlanFeatureFlags = {
      packages: plan === "plus",
      customers: plan === "plus",
      stats: plan === "plus",
    };

    return {
      plan,
      price: PLAN_PRICE[plan],
      limits,
      usage,
      hasCapacity: (feature) => {
        const limit = limits[feature];
        return limit === null || usage[feature] < limit;
      },
      allows: (feature) => features[feature],
    };
  }, [restaurant, byRestaurant, storiesByRestaurant, offersByRestaurant, reservations, real.sub]);
}
