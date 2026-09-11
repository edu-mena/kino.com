import { useEffect, useState } from "react";
import { getEffectiveOffers } from "./offers-store";
import { suspendedRestaurantIds } from "./helpers";
import { INITIAL_OFFERS } from "./mockData";
import type { Offer } from "./types";

/**
 * Todas as ofertas (Luku + criadas pelos restaurantes), reativo ao painel
 * `/admin/promocoes` — mesmo padrão SSR-safe de `@/data/use-menu-items`.
 */
export function useOffers(): Offer[] {
  const [offers, setOffers] = useState<Offer[]>(INITIAL_OFFERS);

  useEffect(() => {
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
