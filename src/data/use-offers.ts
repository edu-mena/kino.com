import { useEffect, useState } from "react";
import { fetchApiOffers } from "./api-offers";
import { getEffectiveOffers } from "./offers-store";
import { suspendedRestaurantIds } from "./helpers";
import { INITIAL_OFFERS } from "./mockData";
import { hasRealBackend } from "@/lib/api-client";
import type { Offer } from "./types";

/**
 * Todas as ofertas (Luku + criadas pelos restaurantes), reativo ao painel
 * `/admin/promocoes` — mesmo padrão SSR-safe de `@/data/use-menu-items`.
 * Com backend real, busca o feed global (`GET /offers`, já só ativas —
 * ver OfferController::index), sem precisar filtrar restaurantes
 * suspensos aqui (isso é responsabilidade do backend).
 */
export function useOffers(): Offer[] {
  const [offers, setOffers] = useState<Offer[]>(hasRealBackend ? [] : INITIAL_OFFERS);

  useEffect(() => {
    if (hasRealBackend) {
      const sync = () =>
        fetchApiOffers()
          .then(setOffers)
          .catch(() => setOffers([]));
      sync();
      window.addEventListener("luku:menu-changed", sync);
      return () => window.removeEventListener("luku:menu-changed", sync);
    }
    const sync = () => {
      const suspended = suspendedRestaurantIds();
      // Esconde as promoções de restaurantes suspensos; as globais da Luku
      // (sem `restaurantId`) ficam sempre.
      setOffers(
        getEffectiveOffers().filter((o) => !o.restaurantId || !suspended.has(o.restaurantId)),
      );
    };
    sync();
    window.addEventListener("luku:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("luku:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return offers;
}
