import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Reservation, Restaurant } from "@/data/types";
import { useAuth } from "@/lib/auth";

const STORAGE_KEY = "kino_custom_reservations";

type NewReservationInput = {
  restaurant: Restaurant;
  date: string;
  time: string;
  peopleCount: number;
  specialRequests?: string;
};

type ReservationsValue = {
  customReservations: Reservation[];
  addReservation: (input: NewReservationInput) => void;
};

const ReservationsContext = createContext<ReservationsValue | null>(null);

export function ReservationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [customReservations, setCustomReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setCustomReservations(JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

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
    const next = [reservation, ...customReservations];
    setCustomReservations(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <ReservationsContext.Provider value={{ customReservations, addReservation }}>
      {children}
    </ReservationsContext.Provider>
  );
}

export function useReservations() {
  const ctx = useContext(ReservationsContext);
  if (!ctx) throw new Error("useReservations must be used inside ReservationsProvider");
  return ctx;
}
