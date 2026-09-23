import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createApiOffer, deleteApiOffer, fetchApiOffers, updateApiOffer } from "@/data/api-offers";
import {
  createLukuOffer,
  createOffer,
  deleteOffer,
  getEffectiveOffers,
  updateOffer,
} from "@/data/offers-store";
import { INITIAL_OFFERS } from "@/data/mockData";
import type { Offer } from "@/data/types";
import { hasRealBackend } from "@/lib/api-client";
import { getAdminToken, useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useSystemAdmin } from "@/lib/system-admin";

type OfferInput = Omit<Offer, "id" | "restaurantId">;

type OffersAdminValue = {
  offers: Offer[];
  offersByRestaurant: (restaurantId: string) => Offer[];
  /** Ofertas globais da Luku — sem `restaurantId` (geridas em `/sistema/promocoes`). */
  lukuOffers: Offer[];
  /** `ok: false` = a escrita falhou (ex: validação do backend — percentagem
   * em falta num tipo que a exige — ou erro de rede); a promoção pode não
   * ter sido guardada. Antes eram `void` (fire-and-forget): a chamada quem
   * criava mostrava sempre "sucesso" mesmo quando a API rejeitava o pedido
   * (ex: 422 por faltar `percent_off`), e a promoção nunca aparecia. */
  createOffer: (restaurantId: string, input: OfferInput) => Promise<boolean>;
  createLukuOffer: (input: OfferInput) => Promise<boolean>;
  updateOffer: (id: string, input: OfferInput) => Promise<boolean>;
  deleteOffer: (id: string) => Promise<boolean>;
};

const OffersAdminContext = createContext<OffersAdminValue | null>(null);

/** `image`/`mediaType` do input → shape que a API real espera (ver
 * @/data/api-offers). Sem `image`, cria/edita sem media. */
function toApiInput(input: OfferInput) {
  return {
    type: input.type,
    title: input.title,
    description: input.description,
    ...(input.code ? { code: input.code } : {}),
    ...(input.percentOff != null ? { percentOff: input.percentOff } : {}),
    ...(input.layout ? { layout: input.layout } : {}),
    // Sempre enviados (mesmo `[]`) — o backend aceita `[]` mesmo numa
    // promoção global (passa a validação `prohibited`, que só rejeita um
    // valor preenchido) e uma edição precisa de conseguir LIMPAR a seleção
    // anterior de um restaurante, não só adicionar.
    menuItemIds: input.targetMenuItemIds ?? [],
    categories: input.targetCategories ?? [],
    ...(input.image
      ? { media: { dataUrl: input.image, mediaType: input.mediaType ?? ("image" as const) } }
      : {}),
  };
}

/**
 * Restaurante-própria (`createOffer`) usa o token do painel do restaurante;
 * global Luku (`createLukuOffer`, `/sistema/promocoes`) usa o do operador
 * — este provider vive dentro de `OperatorProviders`, montado tanto em
 * `/admin/*` como em `/sistema/*`, por isso os dois hooks estão sempre
 * disponíveis aqui (ao contrário de `MenuAdminProvider`/`TablesProvider`,
 * que vivem no `__root` partilhados com páginas de cliente).
 */
export function OffersAdminProvider({ children }: { children: ReactNode }) {
  const { token: operatorToken } = useSystemAdmin();
  const { managedRestaurantId } = useRestaurantAdmin();
  const [apiOffers, setApiOffers] = useState<Offer[]>([]);
  const [mockOffers, setMockOffers] = useState<Offer[]>(hasRealBackend ? [] : INITIAL_OFFERS);

  const refetchApi = () => {
    fetchApiOffers(managedRestaurantId ?? undefined)
      .then(setApiOffers)
      .catch(() => setApiOffers([]));
  };

  useEffect(() => {
    if (hasRealBackend) {
      refetchApi();
      return;
    }
    const sync = () => setMockOffers(getEffectiveOffers());
    sync();
    window.addEventListener("luku:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("luku:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedRestaurantId]);

  const offers = hasRealBackend ? apiOffers : mockOffers;

  const value: OffersAdminValue = hasRealBackend
    ? {
        offers,
        offersByRestaurant: (restaurantId) => offers.filter((o) => o.restaurantId === restaurantId),
        lukuOffers: offers.filter((o) => !o.restaurantId),
        createOffer: async (restaurantId, input) => {
          const token = getAdminToken();
          if (!token) return false;
          try {
            await createApiOffer(restaurantId, toApiInput(input), token);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        createLukuOffer: async (input) => {
          if (!operatorToken) return false;
          try {
            await createApiOffer(null, toApiInput(input), operatorToken);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        updateOffer: async (id, input) => {
          const token = getAdminToken() ?? operatorToken;
          if (!token) return false;
          try {
            await updateApiOffer(id, toApiInput(input), token);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        deleteOffer: async (id) => {
          const token = getAdminToken() ?? operatorToken;
          if (!token) return false;
          try {
            await deleteApiOffer(id, token);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
      }
    : {
        offers,
        offersByRestaurant: (restaurantId) => offers.filter((o) => o.restaurantId === restaurantId),
        lukuOffers: offers.filter((o) => !o.restaurantId),
        createOffer: (restaurantId, input) => {
          createOffer(restaurantId, input);
          return Promise.resolve(true);
        },
        createLukuOffer: (input) => {
          createLukuOffer(input);
          return Promise.resolve(true);
        },
        updateOffer: (id, input) => {
          updateOffer(id, input);
          return Promise.resolve(true);
        },
        deleteOffer: (id) => {
          deleteOffer(id);
          return Promise.resolve(true);
        },
      };

  return <OffersAdminContext.Provider value={value}>{children}</OffersAdminContext.Provider>;
}

export function useOffersAdmin() {
  const ctx = useContext(OffersAdminContext);
  if (!ctx) throw new Error("useOffersAdmin must be used inside OffersAdminProvider");
  return ctx;
}
