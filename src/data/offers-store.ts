import { INITIAL_OFFERS } from "./mockData";
import type { Offer } from "./types";

/**
 * CRUD de promoções do painel do restaurante (`/admin/promocoes`) — mesmo
 * desenho de `@/data/menu-store`: funções puras e síncronas, seguras em
 * SSR. As 3 promoções seed (`INITIAL_OFFERS`, sem `restaurantId`) são da
 * Kino e nunca editáveis/apagáveis por aqui — só as criadas por um
 * restaurante (sempre com `restaurantId`) passam por edição/eliminação.
 */

const OFFERS_KEY = "kino_offers_admin";
const CHANGE_EVENT = "kino:menu-changed";

type OfferInput = Omit<Offer, "id" | "restaurantId">;

type OffersState = {
  customOffers: Offer[];
  overrides: Record<string, OfferInput>;
  deletedIds: string[];
};

const EMPTY_STATE: OffersState = { customOffers: [], overrides: {}, deletedIds: [] };

function readState(): OffersState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const stored = window.localStorage.getItem(OFFERS_KEY);
    return stored ? { ...EMPTY_STATE, ...JSON.parse(stored) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function writeState(state: OffersState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OFFERS_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Todas as ofertas: seed (Kino) + criadas pelos restaurantes − eliminadas,
 * com edições aplicadas. */
export function getEffectiveOffers(): Offer[] {
  const { customOffers, overrides, deletedIds } = readState();
  const fromSeed = INITIAL_OFFERS.filter((o) => !deletedIds.includes(o.id));
  const fromCustom = customOffers
    .filter((o) => !deletedIds.includes(o.id))
    .map((o) => ({ ...o, ...overrides[o.id] }));
  return [...fromSeed, ...fromCustom];
}

export function createOffer(restaurantId: string, input: OfferInput): Offer {
  const state = readState();
  const offer: Offer = { id: `offer-custom-${Date.now()}`, restaurantId, ...input };
  writeState({ ...state, customOffers: [...state.customOffers, offer] });
  return offer;
}

export function updateOffer(id: string, input: OfferInput) {
  const state = readState();
  writeState({ ...state, overrides: { ...state.overrides, [id]: input } });
}

export function deleteOffer(id: string) {
  const state = readState();
  writeState({ ...state, deletedIds: [...state.deletedIds, id] });
}
