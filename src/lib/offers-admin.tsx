import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createOffer, deleteOffer, getEffectiveOffers, updateOffer } from "@/data/offers-store";
import { INITIAL_OFFERS } from "@/data/mockData";
import type { Offer } from "@/data/types";

type OfferInput = Omit<Offer, "id" | "restaurantId">;

type OffersAdminValue = {
  offers: Offer[];
  offersByRestaurant: (restaurantId: string) => Offer[];
  createOffer: (restaurantId: string, input: OfferInput) => Offer;
  updateOffer: (id: string, input: OfferInput) => void;
  deleteOffer: (id: string) => void;
};

const OffersAdminContext = createContext<OffersAdminValue | null>(null);

export function OffersAdminProvider({ children }: { children: ReactNode }) {
  // SSR-safe: primeira renderização usa sempre o seed estático puro, sem
  // tocar em localStorage — evita mismatch de hidratação.
  const [offers, setOffers] = useState<Offer[]>(INITIAL_OFFERS);

  useEffect(() => {
    const sync = () => setOffers(getEffectiveOffers());
    sync();
    window.addEventListener("kino:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("kino:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const value: OffersAdminValue = {
    offers,
    offersByRestaurant: (restaurantId) => offers.filter((o) => o.restaurantId === restaurantId),
    createOffer: (restaurantId, input) => createOffer(restaurantId, input),
    updateOffer: (id, input) => updateOffer(id, input),
    deleteOffer: (id) => deleteOffer(id),
  };

  return <OffersAdminContext.Provider value={value}>{children}</OffersAdminContext.Provider>;
}

export function useOffersAdmin() {
  const ctx = useContext(OffersAdminContext);
  if (!ctx) throw new Error("useOffersAdmin must be used inside OffersAdminProvider");
  return ctx;
}
