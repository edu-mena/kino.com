import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Frota de estafetas partilhada da Kino, usada pelo painel de Pedidos para
 * despachar entregas. Não há backend — o estado vive no localStorage e é a
 * fonte da verdade sobre quem está livre. Um estafeta em entrega não pode
 * ser reatribuído nem posto offline; ao concluir/recusar o pedido volta a
 * ficar disponível.
 */
const STORAGE_KEY = "kino_couriers_v1";

export type CourierVehicle = "moto" | "bicicleta" | "carro";
export type CourierStatus = "disponivel" | "em_entrega" | "offline";

export type Courier = {
  id: string;
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
    name: "Nzola Adão",
    phone: "+244 923 118 204",
    vehicle: "moto",
    zone: "Luanda",
    status: "em_entrega",
    activeOrderId: "order-b4",
  },
  {
    id: "cour-2",
    name: "Ivo Quissanga",
    phone: "+244 912 447 015",
    vehicle: "moto",
    zone: "Luanda",
    status: "disponivel",
  },
  {
    id: "cour-3",
    name: "Bruno Kalunga",
    phone: "+244 928 903 771",
    vehicle: "carro",
    zone: "Luanda",
    status: "em_entrega",
    activeOrderId: "order-seed-1",
  },
  {
    id: "cour-4",
    name: "Selma Katchi",
    phone: "+244 923 660 118",
    vehicle: "bicicleta",
    zone: "Luanda",
    status: "disponivel",
  },
  {
    id: "cour-5",
    name: "Edgar Mbala",
    phone: "+244 917 205 486",
    vehicle: "moto",
    zone: "Luanda",
    status: "offline",
  },
];

type CouriersValue = {
  couriers: Courier[];
  available: Courier[];
  courierForOrder: (orderId: string) => Courier | undefined;
  /** Atribui um estafeta livre a um pedido (fica "em entrega"). */
  assign: (courierId: string, orderId: string) => void;
  /** Liberta quem estiver atribuído a este pedido — usar ao entregar/recusar. */
  releaseOrder: (orderId: string) => void;
  /** Alterna disponível ↔ offline (ignorado se estiver em entrega). */
  setStatus: (courierId: string, status: "disponivel" | "offline") => void;
  /** Gestão da frota (área de sistema, `/sistema/frota`). */
  addCourier: (input: Omit<Courier, "id" | "status" | "activeOrderId">) => void;
  updateCourier: (
    courierId: string,
    patch: Partial<Pick<Courier, "name" | "phone" | "vehicle" | "zone">>,
  ) => void;
  removeCourier: (courierId: string) => void;
};

const CouriersContext = createContext<CouriersValue | null>(null);

export function CouriersProvider({ children }: { children: ReactNode }) {
  const [couriers, setCouriers] = useState<Courier[]>(SEED);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCouriers(JSON.parse(stored) as Courier[]);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(couriers));
  }, [couriers, hydrated]);

  const value = useMemo<CouriersValue>(
    () => ({
      couriers,
      available: couriers.filter((c) => c.status === "disponivel"),
      courierForOrder: (orderId) => couriers.find((c) => c.activeOrderId === orderId),
      assign: (courierId, orderId) =>
        setCouriers((prev) =>
          prev.map((c) => {
            if (c.id === courierId) return { ...c, status: "em_entrega", activeOrderId: orderId };
            // defensivo: nenhum outro estafeta fica preso ao mesmo pedido
            if (c.activeOrderId === orderId) {
              const { activeOrderId: _drop, ...rest } = c;
              return { ...rest, status: "disponivel" };
            }
            return c;
          }),
        ),
      releaseOrder: (orderId) =>
        setCouriers((prev) =>
          prev.map((c) => {
            if (c.activeOrderId !== orderId) return c;
            const { activeOrderId: _drop, ...rest } = c;
            return { ...rest, status: "disponivel" };
          }),
        ),
      setStatus: (courierId, status) =>
        setCouriers((prev) =>
          prev.map((c) => (c.id === courierId && c.status !== "em_entrega" ? { ...c, status } : c)),
        ),
      addCourier: (input) =>
        setCouriers((prev) => [
          ...prev,
          { ...input, id: `cour-${Date.now()}`, status: "disponivel" },
        ]),
      updateCourier: (courierId, patch) =>
        setCouriers((prev) => prev.map((c) => (c.id === courierId ? { ...c, ...patch } : c))),
      removeCourier: (courierId) =>
        setCouriers((prev) =>
          prev.filter((c) => !(c.id === courierId && c.status !== "em_entrega")),
        ),
    }),
    [couriers],
  );

  return <CouriersContext.Provider value={value}>{children}</CouriersContext.Provider>;
}

export function useCouriers() {
  const ctx = useContext(CouriersContext);
  if (!ctx) throw new Error("useCouriers must be used inside CouriersProvider");
  return ctx;
}
