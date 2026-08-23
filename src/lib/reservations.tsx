import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { INITIAL_RESERVATIONS } from "@/data/mockData";
import type { Reservation, Restaurant } from "@/data/types";
import { useAuth } from "@/lib/auth";

const STORAGE_KEY = "kino_reservations";

type NewReservationInput = {
  restaurant: Restaurant;
  date: string;
  time: string;
  peopleCount: number;
  specialRequests?: string;
};

type ReservationsValue = {
  reservations: Reservation[];
  addReservation: (input: NewReservationInput) => void;
  /** Usado pelo painel do restaurante (`/admin/reservas`) — Pendente →
   * Confirmada/Recusada. Não há backend real: como no resto da app, o
   * painel lê/escreve o mesmo estado partilhado que a página de cliente. */
  updateReservationStatus: (id: string, status: string) => void;
};

const ReservationsContext = createContext<ReservationsValue | null>(null);

export function ReservationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // A seed (INITIAL_RESERVATIONS) entra logo no estado — assim vira um
  // registo normal, atualizável (o painel do restaurante precisa poder
  // confirmar/recusar reservas de exemplo, não só as criadas na hora).
  const [reservations, setReservations] = useState<Reservation[]>(INITIAL_RESERVATIONS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
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
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
  }, [reservations, hydrated]);

  const addReservation = ({
    restaurant,
    date,
    time,
    peopleCount,
    specialRequests,
  }: NewReservationInput) => {
    const reservation: Reservation = {
      id: `res-custom-${Date.now()}`,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantImage: restaurant.coverImage,
      customerName: user?.name ?? "Utilizador Kino",
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
  };

  const updateReservationStatus = (id: string, status: string) =>
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  return (
    <ReservationsContext.Provider value={{ reservations, addReservation, updateReservationStatus }}>
      {children}
    </ReservationsContext.Provider>
  );
}

export function useReservations() {
  const ctx = useContext(ReservationsContext);
  if (!ctx) throw new Error("useReservations must be used inside ReservationsProvider");
  return ctx;
}
