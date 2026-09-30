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
import { ApiError, hasRealBackend } from "@/lib/api-client";
import { getAdminToken, useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useSystemAdmin } from "@/lib/system-admin";

type OfferInput = Omit<Offer, "id" | "restaurantId">;

export type SaveResult = true | string;

/** Primeira mensagem de validação do Laravel (422), ou a mensagem do erro. */
function failureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const first = error.errors ? Object.values(error.errors)[0]?.[0] : undefined;
    return first ?? error.message ?? "";
  }
  return "";
}

type OffersAdminValue = {
  offers: Offer[];
  offersByRestaurant: (restaurantId: string) => Offer[];
  /** Ofertas globais da Luku — sem `restaurantId` (geridas em `/sistema/promocoes`). */
  lukuOffers: Offer[];
  /** `true` = gravada. Uma string = falhou, com a mensagem do servidor
   * quando existe (ex: código já usado por outra promoção) ou `""` quando não
   * há nada melhor a dizer do que o erro genérico do formulário. Antes era
   * só `false`, e o painel dizia sempre "Não foi possível guardar" sem
   * explicar porquê. */
  createOffer: (restaurantId: string, input: OfferInput) => Promise<SaveResult>;
  createLukuOffer: (input: OfferInput) => Promise<SaveResult>;
  updateOffer: (id: string, input: OfferInput) => Promise<SaveResult>;
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
    // Só um ficheiro NOVO (data URL) vai como `media`. Ao editar, `image` é
    // o URL já guardado no servidor — convertê-lo com `dataUrlToFile` dava um
    // ficheiro vazio de 0 bytes, o backend recusava (422) e nenhuma edição de
    // promoção com imagem conseguia ser gravada.
    ...(input.image?.startsWith("data:")
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
          if (!token) return "";
          try {
            await createApiOffer(restaurantId, toApiInput(input), token);
            refetchApi();
            return true;
          } catch (error) {
            return failureMessage(error);
          }
        },
        createLukuOffer: async (input) => {
          if (!operatorToken) return "";
          try {
            await createApiOffer(null, toApiInput(input), operatorToken);
            refetchApi();
            return true;
          } catch (error) {
            return failureMessage(error);
          }
        },
        updateOffer: async (id, input) => {
          const token = getAdminToken() ?? operatorToken;
          if (!token) return "";
          try {
            await updateApiOffer(id, toApiInput(input), token);
            refetchApi();
            return true;
          } catch (error) {
            return failureMessage(error);
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
        // Sem backend, a gravação pode falhar pela quota do localStorage
        // (media em data URL) — o resultado real chega ao formulário, que
        // avisa em vez de dizer "guardado" ou ficar parado.
        createOffer: (restaurantId, input) =>
          Promise.resolve(createOffer(restaurantId, input) ? true : ""),
        createLukuOffer: (input) => Promise.resolve(createLukuOffer(input) ? true : ""),
        updateOffer: (id, input) => Promise.resolve(updateOffer(id, input) ? true : ""),
        deleteOffer: (id) => Promise.resolve(deleteOffer(id)),
      };

  return <OffersAdminContext.Provider value={value}>{children}</OffersAdminContext.Provider>;
}

export function useOffersAdmin() {
  const ctx = useContext(OffersAdminContext);
  if (!ctx) throw new Error("useOffersAdmin must be used inside OffersAdminProvider");
  return ctx;
}
