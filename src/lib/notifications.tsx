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
export type LukuNotification = {
  id: string;
  kind: "order" | "reservation";
  refId: string;
  restaurantId: string;
  /** chave i18n do evento: "orderNew" | "orderStatus" | "reservationNew" | "reservationStatus" */
  event: string;
  /** estado novo, para compor o texto */
  status: string;
  /** `ownerKey` do pedido/reserva de origem — o sino do cliente só mostra as
   * do próprio (conta ou convidado). Ausente para registos da seed. */
  ownerKey?: string;
  at: string;
  read: boolean;
};

type NotificationsValue = {
  all: LukuNotification[];
  markRead: (id: string) => void;
  markManyRead: (ids: string[]) => void;
};

/** Notificações de um âmbito: `"restaurant"` filtra por `restaurantId`
 * (painel); `"client"` filtra pelo `ownerKey` de quem está a ver (conta ou
 * convidado) — as da seed não têm `ownerKey`, por isso nunca aparecem aqui.
 * Partilhado pelo sino e pelas páginas de histórico, para os dois
 * concordarem sempre no que é "meu". */
export function scopeNotifications(
  all: LukuNotification[],
  scope: "client" | "restaurant",
  opts: { restaurantId?: string; ownerKey?: string },
): LukuNotification[] {
  return scope === "restaurant" && opts.restaurantId
    ? all.filter((n) => n.restaurantId === opts.restaurantId)
    : all.filter((n) => n.ownerKey === opts.ownerKey);
}

const NotificationsContext = createContext<NotificationsValue | null>(null);
const CAP = 50;

function load(): LukuNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.notifications);
    return raw ? (JSON.parse(raw) as LukuNotification[]) : [];
  } catch {
    return [];
  }
}

/** Junta duas listas sem duplicar — cada aba (cliente/restaurante) observa
 * os mesmos `orders`/`reservations` e por isso pode gerar a MESMA
 * notificação de forma independente (`makeNote` usa um id determinístico
 * exatamente para isto: a mesma transição produz sempre o mesmo id, nunca
 * duas entradas para o mesmo evento). Quando uma entrada existe dos dois
 * lados, `read` vence por OR — lida numa aba tem de ficar lida em todas,
 * nunca "ressuscitar" como não lida por uma escrita desatualizada doutra. */
function mergeNotifications(a: LukuNotification[], b: LukuNotification[]): LukuNotification[] {
  const byId = new Map<string, LukuNotification>();
  for (const n of a) byId.set(n.id, n);
  for (const n of b) {
    const existing = byId.get(n.id);
    byId.set(n.id, existing ? { ...existing, read: existing.read || n.read } : n);
  }
  return [...byId.values()]
    .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    .slice(0, CAP);
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { orders, hydrated: ordersHydrated } = useCart();
  const { reservations, hydrated: reservationsHydrated } = useReservations();
  const { t } = useTranslation();

  const [all, setAll] = useState<LukuNotification[]>(load);
  const orderSnap = useRef<Map<string, string> | null>(null);
  const resvSnap = useRef<Map<string, string> | null>(null);
  // Ids já vistos nesta aba (geradas aqui OU sincronizadas doutra aba) —
  // usado por `pushNotes` para nunca inserir/notificar a mesma transição
  // duas vezes. Vive num ref (não recalculado a cada render) para não
  // arriscar duplo toast com o duplo-invoke de efeitos do StrictMode.
  const knownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const n of all) knownIds.current.add(n.id);
  }, [all]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(all.slice(0, CAP)));
    }
  }, [all]);

  // Sem backend real, cada aba deteta as mudanças de `orders`/`reservations`
  // por si só (ver efeitos abaixo) — mas o estado "lida" de uma notificação
  // só existe na aba onde foi marcada, a não ser que sincronizemos também
  // esta chave. O evento `storage` dispara nas OUTRAS abas quando uma delas
  // grava aqui — é o que faz marcar como lida (ou uma notificação nova
  // sincronizada de outra aba) aparecer sem precisar recarregar.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEYS.notifications) return;
      if (e.newValue == null) {
        setAll([]);
        return;
      }
      try {
        const incoming = JSON.parse(e.newValue) as LukuNotification[];
        setAll((cur) => mergeNotifications(cur, incoming));
      } catch {
        // payload corrompido vindo doutra aba — mantém o que já temos.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    // Antes da hidratação, `orders` ainda é só a seed em memória — comparar
    // contra isso faria os pedidos persistidos "reaparecerem" como novos
    // assim que a hidratação os carregasse a seguir. Só passamos a comparar
    // depois de hidratado; essa primeira passagem hidratada vira a baseline.
    if (!ordersHydrated) return;
    const prev = orderSnap.current;
    const next = new Map(orders.map((o) => [o.id, o.status]));
    if (prev) {
      const fresh: LukuNotification[] = [];
      for (const o of orders) {
        const was = prev.get(o.id);
        if (was === undefined) {
          fresh.push(makeNote("order", o.id, o.restaurantId, "orderNew", o.status, o.ownerKey));
        } else if (was !== o.status) {
          fresh.push(makeNote("order", o.id, o.restaurantId, "orderStatus", o.status, o.ownerKey));
        }
      }
      if (fresh.length) pushNotes(fresh);
    }
    orderSnap.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, ordersHydrated]);

  useEffect(() => {
    // Mesmo raciocínio que em cima: sem isto, cada refresh logo após criar
    // uma reserva fazia-a "reaparecer" como nova quando a hidratação
    // substituía a seed pelos dados persistidos.
    if (!reservationsHydrated) return;
    const prev = resvSnap.current;
    const next = new Map(reservations.map((r) => [r.id, r.status]));
    if (prev) {
      const fresh: LukuNotification[] = [];
      for (const r of reservations) {
        const was = prev.get(r.id);
        if (was === undefined) {
          fresh.push(
            makeNote("reservation", r.id, r.restaurantId, "reservationNew", r.status, r.ownerKey),
          );
        } else if (was !== r.status) {
          fresh.push(
            makeNote(
              "reservation",
              r.id,
              r.restaurantId,
              "reservationStatus",
              r.status,
              r.ownerKey,
            ),
          );
        }
      }
      if (fresh.length) pushNotes(fresh);
    }
    resvSnap.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations, reservationsHydrated]);

  function makeNote(
    kind: LukuNotification["kind"],
    refId: string,
    restaurantId: string,
    event: string,
    status: string,
    ownerKey?: string,
  ): LukuNotification {
    return {
      // Determinístico (não `Date.now()`/`Math.random()`) — cliente e
      // restaurante observam os MESMOS `orders`/`reservations` e cada aba
      // gera esta nota de forma independente; um id determinístico garante
      // que as duas chegam ao mesmo id para o mesmo evento, então o merge
      // entre abas (`mergeNotifications`) as reconhece como uma só, nunca
      // duplicando a entrada nem o toast.
      id: `ntf-${kind}-${refId}-${event}-${status}`,
      kind,
      refId,
      restaurantId,
      event,
      status,
      ...(ownerKey ? { ownerKey } : {}),
      at: new Date().toISOString(),
      read: false,
    };
  }

  function noteText(n: LukuNotification) {
    const name = getRestaurant(n.restaurantId)?.name ?? "";
    return t(`notifications.${n.event}`, { name, status: n.status });
  }

  function pushNotes(fresh: LukuNotification[]) {
    const newOnes = fresh.filter((n) => !knownIds.current.has(n.id));
    if (newOnes.length === 0) return;
    for (const n of newOnes) knownIds.current.add(n.id);
    setAll((cur) => mergeNotifications(cur, newOnes));
    for (const n of newOnes) toast(noteText(n));
  }

  const value = useMemo<NotificationsValue>(
    () => ({
      all,
      markRead: (id) => setAll((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n))),
      markManyRead: (ids) => {
        if (ids.length === 0) return;
        const set = new Set(ids);
        setAll((cur) => cur.map((n) => (set.has(n.id) ? { ...n, read: true } : n)));
      },
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
