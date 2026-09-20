import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createApiCourier,
  deleteApiCourier,
  fetchApiCouriers,
  setApiCourierStatus,
  updateApiCourier,
} from "@/data/api-couriers";
import { STORAGE_KEYS } from "@/data/storage-keys";
import { hasRealBackend } from "@/lib/api-client";
import { getAdminToken, useRestaurantAdmin } from "@/lib/restaurant-admin";

/**
 * Estafetas de cada restaurante — geridos no painel de Pedidos
 * (`/admin/pedidos`). Com backend real, CRUD ligado à API (ver
 * @/data/api-couriers), escopado ao restaurante do painel. A atribuição a
 * um pedido em concreto (`assign`) acontece de facto no backend via
 * `OrderController::dispatch` (ver `dispatchOrder` em `@/lib/cart`) — aqui
 * `assign`/`releaseOrder` só pedem um refetch para refletir o novo estado.
 * `CouriersProvider` vive dentro de `OperatorProviders` (só `/admin/*` e
 * `/sistema/*`), por isso pode usar `useRestaurantAdmin()` diretamente.
 */
const STORAGE_KEY = STORAGE_KEYS.couriers;

export type CourierVehicle = "moto" | "bicicleta" | "carro";
export type CourierStatus = "disponivel" | "em_entrega" | "offline";

export type Courier = {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  vehicle: CourierVehicle;
  zone: string;
  status: CourierStatus;
  /** Pedido que o estafeta está a entregar (só quando `status === "em_entrega"`). */
  activeOrderId?: string;
};

const SEED: Courier[] = [
  {
    id: "cour-1",
    restaurantId: "rest-1",
    name: "Nzola Adão",
    phone: "+244 923 118 204",
    vehicle: "moto",
    zone: "Luanda",
    status: "em_entrega",
    activeOrderId: "order-b4",
  },
  {
    id: "cour-2",
    restaurantId: "rest-1",
    name: "Ivo Quissanga",
    phone: "+244 912 447 015",
    vehicle: "moto",
    zone: "Luanda",
    status: "disponivel",
  },
  {
    id: "cour-3",
    restaurantId: "rest-6",
    name: "Bruno Kalunga",
    phone: "+244 928 903 771",
    vehicle: "carro",
    zone: "Luanda",
    status: "em_entrega",
    activeOrderId: "order-seed-1",
  },
  {
    id: "cour-4",
    restaurantId: "rest-1",
    name: "Selma Katchi",
    phone: "+244 923 660 118",
    vehicle: "bicicleta",
    zone: "Luanda",
    status: "disponivel",
  },
  {
    id: "cour-5",
    restaurantId: "rest-1",
    name: "Edgar Mbala",
    phone: "+244 917 205 486",
    vehicle: "moto",
    zone: "Luanda",
    status: "offline",
  },
];

type CourierInput = Omit<Courier, "id" | "status" | "activeOrderId">;

type CouriersValue = {
  /** Estafetas de um restaurante. */
  couriersByRestaurant: (restaurantId: string) => Courier[];
  /** Estafetas livres de um restaurante. */
  availableByRestaurant: (restaurantId: string) => Courier[];
  courierForOrder: (orderId: string) => Courier | undefined;
  /** Atribui um estafeta livre a um pedido (fica "em entrega"). Com
   * backend real, isto só pede um refetch — a atribuição de facto
   * acontece via `dispatchOrder` (@/lib/cart), atomicamente com o pedido. */
  assign: (courierId: string, orderId: string) => void;
  /** Liberta quem estiver atribuído a este pedido — usar ao entregar/recusar. */
  releaseOrder: (orderId: string) => void;
  /** Alterna disponível ↔ offline (ignorado se estiver em entrega). */
  setStatus: (courierId: string, status: "disponivel" | "offline") => void;
  /** CRUD dos estafetas do restaurante (painel de Pedidos). */
  addCourier: (input: CourierInput) => void;
  updateCourier: (
    courierId: string,
    patch: Partial<Pick<Courier, "name" | "phone" | "vehicle" | "zone">>,
  ) => void;
  removeCourier: (courierId: string) => void;
};

const CouriersContext = createContext<CouriersValue | null>(null);

export function CouriersProvider({ children }: { children: ReactNode }) {
  const { managedRestaurantId } = useRestaurantAdmin();
  const [apiCouriers, setApiCouriers] = useState<Courier[]>([]);
  const [mockCouriers, setMockCouriers] = useState<Courier[]>(SEED);
  const [hydrated, setHydrated] = useState(false);

  const refetchApi = () => {
    const token = getAdminToken();
    if (!managedRestaurantId || !token) return setApiCouriers([]);
    fetchApiCouriers(managedRestaurantId, token)
      .then(setApiCouriers)
      .catch(() => setApiCouriers([]));
  };

  useEffect(() => {
    if (hasRealBackend) {
      refetchApi();
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedRestaurantId]);

  useEffect(() => {
    if (hasRealBackend) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setMockCouriers(JSON.parse(stored) as Courier[]);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hasRealBackend || !hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockCouriers));
  }, [mockCouriers, hydrated]);

  const couriers = hasRealBackend ? apiCouriers : mockCouriers;

  const value = useMemo<CouriersValue>(() => {
    const forRestaurant = (restaurantId: string) =>
      couriers.filter((c) => c.restaurantId === restaurantId);
    const base = {
      couriersByRestaurant: forRestaurant,
      availableByRestaurant: (restaurantId: string) =>
        forRestaurant(restaurantId).filter((c) => c.status === "disponivel"),
      courierForOrder: (orderId: string) => couriers.find((c) => c.activeOrderId === orderId),
    };
    if (hasRealBackend) {
      return {
        ...base,
        assign: () => refetchApi(),
        releaseOrder: () => refetchApi(),
        setStatus: (courierId, status) => {
          const token = getAdminToken();
          const item = couriers.find((c) => c.id === courierId);
          if (!token || !item) return;
          void setApiCourierStatus(courierId, item.restaurantId, status, token).then(refetchApi);
        },
        addCourier: (input) => {
          const token = getAdminToken();
          if (!token) return;
          const { restaurantId, ...rest } = input;
          void createApiCourier(restaurantId, rest, token).then(refetchApi);
        },
        updateCourier: (courierId, patch) => {
          const token = getAdminToken();
          const item = couriers.find((c) => c.id === courierId);
          if (!token || !item) return;
          void updateApiCourier(courierId, item.restaurantId, patch, token).then(refetchApi);
        },
        removeCourier: (courierId) => {
          const token = getAdminToken();
          if (!token) return;
          void deleteApiCourier(courierId, token).then(refetchApi);
        },
      };
    }
    return {
      ...base,
      assign: (courierId, orderId) =>
        setMockCouriers((prev) =>
          prev.map((c) => {
            if (c.id === courierId) return { ...c, status: "em_entrega", activeOrderId: orderId };
            if (c.activeOrderId === orderId) {
              const { activeOrderId: _drop, ...rest } = c;
              return { ...rest, status: "disponivel" };
            }
            return c;
          }),
        ),
      releaseOrder: (orderId) =>
        setMockCouriers((prev) =>
          prev.map((c) => {
            if (c.activeOrderId !== orderId) return c;
            const { activeOrderId: _drop, ...rest } = c;
            return { ...rest, status: "disponivel" };
          }),
        ),
      setStatus: (courierId, status) =>
        setMockCouriers((prev) =>
          prev.map((c) => (c.id === courierId && c.status !== "em_entrega" ? { ...c, status } : c)),
        ),
      addCourier: (input) =>
        setMockCouriers((prev) => [
          ...prev,
          { ...input, id: `cour-${Date.now()}`, status: "disponivel" },
        ]),
      updateCourier: (courierId, patch) =>
        setMockCouriers((prev) => prev.map((c) => (c.id === courierId ? { ...c, ...patch } : c))),
      removeCourier: (courierId) =>
        setMockCouriers((prev) =>
          prev.filter((c) => !(c.id === courierId && c.status !== "em_entrega")),
        ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couriers]);

  return <CouriersContext.Provider value={value}>{children}</CouriersContext.Provider>;
}

export function useCouriers() {
  const ctx = useContext(CouriersContext);
  if (!ctx) throw new Error("useCouriers must be used inside CouriersProvider");
  return ctx;
}

/**
 * Leitura pura e síncrona do estafeta atribuído a um pedido — para o lado do
 * cliente (`/entrega`), que não monta o `CouriersProvider` (esse fica só nos
 * ramos de operador). Com backend real, a API não expõe qual estafeta está
 * atribuído a um pedido para o CLIENTE (só para staff, via listagem de
 * estafetas) — devolve sempre `null` nesse caso; a UI já trata isso como
 * "sem informação do estafeta ainda" (mesmo comportamento de um pedido sem
 * estafeta atribuído). Sem backend, lê o localStorage de sempre.
 */
export function readCourierForOrder(
  orderId: string,
): Pick<Courier, "name" | "phone" | "vehicle"> | null {
  if (hasRealBackend) return null;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const couriers = JSON.parse(raw) as Courier[];
    const hit = couriers.find((c) => c.activeOrderId === orderId);
    return hit ? { name: hit.name, phone: hit.phone, vehicle: hit.vehicle } : null;
  } catch {
    return null;
  }
}
