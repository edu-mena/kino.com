import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  assignApiReservationTable,
  cancelApiReservation,
  createApiReservation,
  fetchApiReservationsForRestaurant,
  fetchMyApiReservations,
  updateApiReservationStatus,
} from "@/data/api-reservations";
import { INITIAL_RESERVATIONS } from "@/data/mockData";
import type { Reservation, Restaurant } from "@/data/types";
import { getAuthToken, useAuth } from "@/lib/auth";
import { hasRealBackend } from "@/lib/api-client";
import { viewerKey } from "@/lib/customer";
import { getAdminToken, useManagedRestaurantId } from "@/lib/restaurant-admin";

const SEED_RESERVATIONS: Reservation[] = hasRealBackend ? [] : INITIAL_RESERVATIONS;

// Sufixo de versão: subir quando a seed (`INITIAL_RESERVATIONS`) muda de forma
// relevante — invalida o snapshot antigo no browser, que de outro modo continua
// a "esconder" as reservas novas da seed.
const STORAGE_KEY = "luku_reservations_v2";

type NewReservationInput = {
  restaurant: Restaurant;
  date: string;
  time: string;
  peopleCount: number;
  specialRequests?: string;
};

type ReservationsValue = {
  reservations: Reservation[];
  /** `false` até o efeito de hidratação (localStorage) correr — usado por
   * quem faz diffs sobre `reservations` (ex.: notificações) para não
   * confundir a troca seed → dados persistidos com reservas "novas". */
  hydrated: boolean;
  /** `ok: false` = a criação falhou (validação do backend ou erro de rede)
   * — a reserva pode não ter sido gravada. Antes era `void`
   * (fire-and-forget): quem chamava mostrava sempre "sucesso" mesmo quando
   * a API rejeitava o pedido, e a reserva nunca aparecia em lado nenhum. */
  addReservation: (input: NewReservationInput) => Promise<boolean>;
  /** Usado pelo painel do restaurante (`/admin/reservas`) — Pendente →
   * Confirmada/Recusada/Cancelada. */
  updateReservationStatus: (id: string, status: string) => void;
  /** Cliente cancela a própria reserva "Pendente" (`/reservas`) — distinto
   * de `updateReservationStatus`: esse é staff-only (token de admin) e nem
   * tem "Cancelada" mapeada para a API; este usa o token do CLIENTE e a
   * rota pública dedicada (`ReservationController::cancel`). */
  cancelReservation: (id: string) => Promise<boolean>;
  /** Mesa atribuída pelo restaurante (opcional; `undefined` limpa). */
  assignTable: (id: string, tableId?: string) => void;
};

const ReservationsContext = createContext<ReservationsValue | null>(null);

/**
 * Com backend real (`hasRealBackend`), a fonte dos dados depende de ONDE a
 * app está a ser usada — este provider é único (montado no `__root`), mas
 * o painel do restaurante e as páginas de cliente nunca estão ativos ao
 * mesmo tempo:
 * - dentro do painel (`useManagedRestaurantId()` não-nulo): busca as
 *   reservas DESSE restaurante (staff, `GET /restaurants/{id}/reservations`).
 *   Não dá para usar `useRestaurantAdminOptional` aqui — este provider é
 *   ancestral de `RestaurantAdminProvider` na árvore, nunca consegue ler o
 *   contexto dele (ver `useManagedRestaurantId` em `@/lib/restaurant-admin`).
 * - fora dele (cliente): busca "as minhas reservas" do utilizador
 *   autenticado (`GET /reservations`) — convidados sem sessão ficam sem
 *   lista agregada (limitação conhecida: a API só permite ver uma reserva
 *   de convidado individualmente, pelo `guestToken`).
 * Sem backend, mantém-se o mock local partilhado de sempre.
 */
export function ReservationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const managedRestaurantId = useManagedRestaurantId();
  const [apiReservations, setApiReservations] = useState<Reservation[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>(SEED_RESERVATIONS);
  const [hydrated, setHydrated] = useState(false);

  const refetchApi = () => {
    if (managedRestaurantId) {
      const token = getAdminToken();
      if (!token) return setApiReservations([]);
      fetchApiReservationsForRestaurant(managedRestaurantId, token)
        .then(setApiReservations)
        .catch(() => setApiReservations([]));
      return;
    }
    const token = getAuthToken();
    if (!token) return setApiReservations([]);
    fetchMyApiReservations(token, viewerKey(user))
      .then(setApiReservations)
      .catch(() => setApiReservations([]));
  };

  useEffect(() => {
    if (hasRealBackend) refetchApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedRestaurantId, user?.email, user?.phone]);

  useEffect(() => {
    if (hasRealBackend) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setReservations(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hasRealBackend || !hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
  }, [reservations, hydrated]);

  // Mesmo raciocínio que em `cart.tsx`: sem backend real, painel e cliente
  // partilham o localStorage, mas só a aba que escreve via reativa de
  // imediato. O evento `storage` dispara nas OUTRAS abas — é o que faz uma
  // reserva nova, ou uma mudança de estado, aparecer ao vivo do outro lado
  // (e disparar a notificação certa) sem precisar recarregar a página.
  useEffect(() => {
    if (hasRealBackend) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue == null) {
        setReservations(SEED_RESERVATIONS);
        return;
      }
      try {
        setReservations(JSON.parse(e.newValue) as Reservation[]);
      } catch {
        // payload corrompido vindo doutra aba — mantém o que já temos.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addReservation = async ({
    restaurant,
    date,
    time,
    peopleCount,
    specialRequests,
  }: NewReservationInput): Promise<boolean> => {
    if (hasRealBackend) {
      const token = getAuthToken();
      try {
        await createApiReservation(
          restaurant.id,
          {
            date,
            time,
            peopleCount,
            ...(specialRequests ? { specialRequests } : {}),
            ...(user?.name ? { customerName: user.name } : {}),
            ...(user?.phone ? { customerPhone: user.phone } : {}),
            ...(user?.email ? { customerEmail: user.email } : {}),
          },
          token,
        );
        refetchApi();
        return true;
      } catch {
        return false;
      }
    }
    const reservation: Reservation = {
      id: `res-custom-${Date.now()}`,
      restaurantId: restaurant.id,
      ownerKey: viewerKey(user),
      restaurantName: restaurant.name,
      restaurantImage: restaurant.coverImage,
      customerName: user?.name ?? "Cliente Luku",
      customerPhone: user?.phone ?? "",
      customerEmail: user?.email ?? "",
      date,
      time,
      peopleCount,
      cautionAmount: restaurant.cautionAmount,
      cautionStatus: "Pendente",
      // A confirmação é sempre do restaurante — o pedido só fica "Confirmada"
      // depois de o restaurante aceitar (fluxo Pendente → Confirmada).
      status: "Pendente",
      ...(specialRequests ? { specialRequests } : {}),
      createdAt: new Date().toISOString(),
    };
    setReservations((prev) => [reservation, ...prev]);
    return true;
  };

  const updateReservationStatus = (id: string, status: string) => {
    if (hasRealBackend) {
      const token = getAdminToken();
      if (!token) return;
      void updateApiReservationStatus(id, status, token).then(refetchApi);
      return;
    }
    setReservations((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status, statusUpdatedAt: new Date().toISOString() } : r,
      ),
    );
  };

  const cancelReservation = async (id: string): Promise<boolean> => {
    if (hasRealBackend) {
      const token = getAuthToken();
      try {
        await cancelApiReservation(id, token);
        refetchApi();
        return true;
      } catch {
        return false;
      }
    }
    setReservations((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "Cancelada", statusUpdatedAt: new Date().toISOString() } : r,
      ),
    );
    return true;
  };

  const assignTable = (id: string, tableId?: string) => {
    if (hasRealBackend) {
      const token = getAdminToken();
      if (!token) return;
      void assignApiReservationTable(id, tableId, token).then(refetchApi);
      return;
    }
    setReservations((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (!tableId) {
          const { tableId: _drop, ...rest } = r;
          return rest;
        }
        return { ...r, tableId };
      }),
    );
  };

  return (
    <ReservationsContext.Provider
      value={{
        reservations: hasRealBackend ? apiReservations : reservations,
        hydrated: hasRealBackend ? true : hydrated,
        addReservation,
        updateReservationStatus,
        cancelReservation,
        assignTable,
      }}
    >
      {children}
    </ReservationsContext.Provider>
  );
}

export function useReservations() {
  const ctx = useContext(ReservationsContext);
  if (!ctx) throw new Error("useReservations must be used inside ReservationsProvider");
  return ctx;
}
