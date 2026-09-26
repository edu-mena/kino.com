import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  fetchApiNotifications,
  fetchApiRestaurantNotifications,
  markApiNotificationRead,
  markManyApiNotificationsRead,
} from "@/data/api-notifications";
import { getRestaurant } from "@/data/helpers";
import { STORAGE_KEYS } from "@/data/storage-keys";
import { useTranslation } from "@/i18n";
import { hasRealBackend } from "@/lib/api-client";
import { getAuthToken, useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { viewerKey } from "@/lib/customer";
import { formatKz } from "@/lib/format";
import { useMockFollowerNotes } from "@/lib/follow-notifications-mock";
import {
  getAdminToken,
  getManagedRestaurantId,
  useManagedRestaurantId,
} from "@/lib/restaurant-admin";
import {
  REALTIME_NOTIFICATION_EVENT,
  subscribeToNotifications,
  type RealtimeNotificationPayload,
} from "@/lib/echo";
import { useReservations } from "@/lib/reservations";

type TFn = (path: string, vars?: Record<string, string | number>) => string;

/** Texto da notificação — usa a versão com contexto (itens/valor,
 * pessoas/hora) quando o `snapshot` existe, senão cai na versão genérica de
 * sempre (notificações antigas, ou de seguidor, nunca tiveram isto). Um só
 * sítio (não duplicado no sino/lista/toast) para nunca divergir. */
export function notificationText(t: TFn, n: LukuNotification, name: string): string {
  const s = n.snapshot;
  if (n.event === "orderNew" && s?.itemCount != null && s.total != null) {
    return t("notifications.orderNewDetailed", {
      name,
      itemCount: s.itemCount,
      total: formatKz(s.total),
    });
  }
  if (n.event === "orderStatus" && s?.itemCount != null && s.total != null) {
    return t("notifications.orderStatusDetailed", {
      name,
      itemCount: s.itemCount,
      total: formatKz(s.total),
      statusLabel: t(`orderStatus.${n.status}`),
    });
  }
  if (n.event === "reservationNew" && s?.peopleCount != null && s.time) {
    return t("notifications.reservationNewDetailed", {
      name,
      peopleCount: s.peopleCount,
      time: s.time,
    });
  }
  if (n.event === "reservationStatus" && s?.peopleCount != null && s.time) {
    return t("notifications.reservationStatusDetailed", {
      name,
      peopleCount: s.peopleCount,
      time: s.time,
      statusLabel: t(`reservationStatus.${n.status}`),
    });
  }
  return t(`notifications.${n.event}`, { name, status: n.status });
}

/**
 * Notificações de mudança de estado — sem backend, um provider observa os
 * mesmos `orders`/`reservations` que o resto da app e, quando um estado
 * transita (ou surge um registo novo), guarda uma notificação e dispara um
 * toast. Consumido por dois sinos: cliente (todas) e painel do restaurante
 * (só as do restaurante gerido).
 */
/** Contexto extra para o texto deixar de ser genérico — ver
 * `PlanLimitService`-style comentário no backend, `Notification::snapshot()`.
 * Ausente em notificações antigas (criadas antes desta ronda) ou de
 * seguidor, que nunca tiveram isto. */
export type NotificationSnapshot = {
  itemCount?: number;
  total?: number;
  peopleCount?: number;
  date?: string;
  time?: string;
};

export type LukuNotification = {
  id: string;
  /** `"restaurant"` = aviso a quem segue o restaurante (story, promoção,
   * preços — ver @/lib/follows); `refId` é o próprio restaurante. */
  kind: "order" | "reservation" | "restaurant";
  refId: string;
  restaurantId: string;
  /** chave i18n do evento: "orderNew" | "orderStatus" | "reservationNew" | "reservationStatus" */
  event: string;
  /** estado novo, para compor o texto */
  status: string;
  snapshot?: NotificationSnapshot;
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

/** Escolhe a implementação logo aqui (não com `if (hasRealBackend) return`
 * espalhado pelos effects abaixo) — os dois modos têm efeitos/ordem de
 * hooks bem diferentes (diffing local vs. fetch+poll), separar em dois
 * componentes evita ter de justificar cada guard individualmente. */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  return hasRealBackend ? (
    <RealNotificationsProvider>{children}</RealNotificationsProvider>
  ) : (
    <MockNotificationsProvider>{children}</MockNotificationsProvider>
  );
}

function MockNotificationsProvider({ children }: { children: ReactNode }) {
  const { orders, hydrated: ordersHydrated, orderTotal } = useCart();
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
        const snapshot = { itemCount: o.lines.length, total: orderTotal(o) };
        if (was === undefined) {
          fresh.push(
            makeNote("order", o.id, o.restaurantId, "orderNew", o.status, snapshot, o.ownerKey),
          );
        } else if (was !== o.status) {
          fresh.push(
            makeNote("order", o.id, o.restaurantId, "orderStatus", o.status, snapshot, o.ownerKey),
          );
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
        const snapshot = { peopleCount: r.peopleCount, date: r.date, time: r.time };
        if (was === undefined) {
          fresh.push(
            makeNote(
              "reservation",
              r.id,
              r.restaurantId,
              "reservationNew",
              r.status,
              snapshot,
              r.ownerKey,
            ),
          );
        } else if (was !== r.status) {
          fresh.push(
            makeNote(
              "reservation",
              r.id,
              r.restaurantId,
              "reservationStatus",
              r.status,
              snapshot,
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
    snapshot?: NotificationSnapshot,
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
      ...(snapshot ? { snapshot } : {}),
      ...(ownerKey ? { ownerKey } : {}),
      at: new Date().toISOString(),
      read: false,
    };
  }

  // Avisos a seguidores (story/promoção/preços de restaurantes seguidos).
  useMockFollowerNotes((fresh) => pushNotes(fresh), true);

  function noteText(n: LukuNotification) {
    const name = getRestaurant(n.restaurantId)?.name ?? "";
    return notificationText(t, n, name);
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

const POLL_MS = 30_000;

/** Com backend real, não há diffing local nenhum — o servidor já cria a
 * notificação certa no evento (ver Observers em backend/app/Observers).
 * Sem WebSocket/broadcast ligado ainda (Reverb corre no Fly mas nenhum
 * evento transmite por ele hoje), a atualização é por poll período + focus,
 * não instantânea — aceitável para um sino, o toast "em tempo real" de
 * verdade já existe via push (ver @/lib/push-notifications). */
function RealNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const managedRestaurantId = useManagedRestaurantId();
  const { orders } = useCart();
  const { reservations } = useReservations();
  const [clientNotes, setClientNotes] = useState<LukuNotification[]>([]);
  const [restaurantNotes, setRestaurantNotes] = useState<LukuNotification[]>([]);

  const refetchClient = useCallback(() => {
    const token = getAuthToken();
    if (!token) {
      setClientNotes([]);
      return;
    }
    fetchApiNotifications(token, viewerKey(user))
      .then(setClientNotes)
      .catch(() => setClientNotes([]));
  }, [user]);

  const refetchRestaurant = useCallback(() => {
    const token = getAdminToken();
    const restaurantId = getManagedRestaurantId();
    if (!token || !restaurantId) {
      setRestaurantNotes([]);
      return;
    }
    fetchApiRestaurantNotifications(restaurantId, token)
      .then(setRestaurantNotes)
      .catch(() => setRestaurantNotes([]));
  }, []);

  const refetchAll = useCallback(() => {
    refetchClient();
    refetchRestaurant();
  }, [refetchClient, refetchRestaurant]);

  useEffect(() => {
    refetchAll();
    const onFocus = () => refetchAll();
    const onStorage = (e: StorageEvent) => {
      // Login/logout do painel (`getAdminToken`) ou da conta (`getAuthToken`)
      // não disparam re-render sozinhos aqui — reagir ao `storage` cobre
      // login/logout nesta ou noutra aba.
      if (e.key === null) return;
      refetchAll();
    };
    const interval = window.setInterval(refetchAll, POLL_MS);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [refetchAll]);

  // Fase N3 — Reverb: liga aos canais privados para reagir de imediato,
  // sem esperar o próximo dos 30s acima. `refetchAll()` atualiza o sino já
  // aqui; o evento global avisa Cart/Reservations (fora deste provider) a
  // fazerem o próprio refetch — mesma ideia do `storage` já usado para
  // sincronizar entre abas, agora entre o servidor e a app.
  useEffect(() => {
    const onEvent = (payload: RealtimeNotificationPayload) => {
      refetchAll();
      window.dispatchEvent(new CustomEvent(REALTIME_NOTIFICATION_EVENT, { detail: payload }));
    };

    const cleanups: Array<() => void> = [];
    const clientToken = getAuthToken();
    if (clientToken && user) {
      cleanups.push(subscribeToNotifications(clientToken, { type: "user", id: user.id }, onEvent));
    }
    const adminToken = getAdminToken();
    if (adminToken && managedRestaurantId) {
      cleanups.push(
        subscribeToNotifications(
          adminToken,
          { type: "restaurant", id: managedRestaurantId },
          onEvent,
        ),
      );
    }
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, managedRestaurantId]);

  // `refId` do cliente não vem com `restaurantId` do backend (a notificação
  // do cliente só guarda user_id, ver OrderObserver::notify) — resolve-se
  // aqui contra os pedidos/reservas já carregados pelo próprio cliente, a
  // mesma fonte que o resto do site usa.
  const enrichedClientNotes = useMemo(() => {
    const orderRestaurant = new Map(orders.map((o) => [o.id, o.restaurantId]));
    const resvRestaurant = new Map(reservations.map((r) => [r.id, r.restaurantId]));
    return clientNotes.map((n) => ({
      ...n,
      restaurantId:
        n.restaurantId ||
        (n.kind === "order" ? orderRestaurant.get(n.refId) : resvRestaurant.get(n.refId)) ||
        "",
    }));
  }, [clientNotes, orders, reservations]);

  const all = useMemo(
    () => mergeNotifications(enrichedClientNotes, restaurantNotes),
    [enrichedClientNotes, restaurantNotes],
  );

  const value = useMemo<NotificationsValue>(
    () => ({
      all,
      markRead: (id) => {
        const note = all.find((n) => n.id === id);
        if (!note) return;
        setAllRead([id]);
        const token = note.ownerKey ? getAuthToken() : getAdminToken();
        if (!token) return;
        void markApiNotificationRead(id, token).catch(() => refetchAll());
      },
      markManyRead: (ids) => {
        if (ids.length === 0) return;
        setAllRead(ids);
        const byOwner = ids.filter((id) => all.find((n) => n.id === id)?.ownerKey);
        const byRestaurant = ids.filter((id) => !all.find((n) => n.id === id)?.ownerKey);
        const clientToken = getAuthToken();
        const adminToken = getAdminToken();
        const restaurantId = getManagedRestaurantId();
        if (byOwner.length > 0 && clientToken) {
          void markManyApiNotificationsRead(byOwner, clientToken).catch(() => refetchAll());
        }
        if (byRestaurant.length > 0 && adminToken && restaurantId) {
          void markManyApiNotificationsRead(byRestaurant, adminToken, restaurantId).catch(() =>
            refetchAll(),
          );
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all],
  );

  function setAllRead(ids: string[]) {
    const set = new Set(ids);
    setClientNotes((cur) => cur.map((n) => (set.has(n.id) ? { ...n, read: true } : n)));
    setRestaurantNotes((cur) => cur.map((n) => (set.has(n.id) ? { ...n, read: true } : n)));
  }

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
