import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { STORAGE_KEYS } from "@/data/storage-keys";
import { getRestaurant } from "@/data/helpers";
import { useTranslation } from "@/i18n";
import { useCart } from "@/lib/cart";
import { useReservations } from "@/lib/reservations";

/**
 * Notificações de mudança de estado — sem backend, um provider observa os
 * mesmos `orders`/`reservations` que o resto da app e, quando um estado
 * transita (ou surge um registo novo), guarda uma notificação e dispara um
 * toast. Consumido por dois sinos: cliente (todas) e painel do restaurante
 * (só as do restaurante gerido).
 */
export type KinoNotification = {
  id: string;
  kind: "order" | "reservation";
  refId: string;
  restaurantId: string;
  /** chave i18n do evento: "orderNew" | "orderStatus" | "reservationNew" | "reservationStatus" */
  event: string;
  /** estado novo, para compor o texto */
  status: string;
  at: string;
  read: boolean;
};

type NotificationsValue = {
  all: KinoNotification[];
  markAllRead: () => void;
  markRead: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsValue | null>(null);
const CAP = 50;

function load(): KinoNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.notifications);
    return raw ? (JSON.parse(raw) as KinoNotification[]) : [];
  } catch {
    return [];
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { orders } = useCart();
  const { reservations } = useReservations();
  const { t } = useTranslation();

  const [all, setAll] = useState<KinoNotification[]>(load);
  const orderSnap = useRef<Map<string, string> | null>(null);
  const resvSnap = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(all.slice(0, CAP)));
    }
  }, [all]);

  useEffect(() => {
    const prev = orderSnap.current;
    const next = new Map(orders.map((o) => [o.id, o.status]));
    if (prev) {
      const fresh: KinoNotification[] = [];
      for (const o of orders) {
        const was = prev.get(o.id);
        if (was === undefined) {
          fresh.push(makeNote("order", o.id, o.restaurantId, "orderNew", o.status));
        } else if (was !== o.status) {
          fresh.push(makeNote("order", o.id, o.restaurantId, "orderStatus", o.status));
        }
      }
      if (fresh.length) pushNotes(fresh);
    }
    orderSnap.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  useEffect(() => {
    const prev = resvSnap.current;
    const next = new Map(reservations.map((r) => [r.id, r.status]));
    if (prev) {
      const fresh: KinoNotification[] = [];
      for (const r of reservations) {
        const was = prev.get(r.id);
        if (was === undefined) {
          fresh.push(makeNote("reservation", r.id, r.restaurantId, "reservationNew", r.status));
        } else if (was !== r.status) {
          fresh.push(makeNote("reservation", r.id, r.restaurantId, "reservationStatus", r.status));
        }
      }
      if (fresh.length) pushNotes(fresh);
    }
    resvSnap.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations]);

  function makeNote(
    kind: KinoNotification["kind"],
    refId: string,
    restaurantId: string,
    event: string,
    status: string,
  ): KinoNotification {
    return {
      id: `ntf-${kind}-${refId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind,
      refId,
      restaurantId,
      event,
      status,
      at: new Date().toISOString(),
      read: false,
    };
  }

  function noteText(n: KinoNotification) {
    const name = getRestaurant(n.restaurantId)?.name ?? "";
    return t(`notifications.${n.event}`, { name, status: n.status });
  }

  function pushNotes(fresh: KinoNotification[]) {
    setAll((cur) => [...fresh, ...cur].slice(0, CAP));
    for (const n of fresh) toast(noteText(n));
  }

  const value = useMemo<NotificationsValue>(
    () => ({
      all,
      markAllRead: () => setAll((cur) => cur.map((n) => ({ ...n, read: true }))),
      markRead: (id) => setAll((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n))),
    }),
    [all],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
