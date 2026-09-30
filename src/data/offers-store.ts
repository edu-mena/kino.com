import { hasRealBackend } from "@/lib/api-client";
import { INITIAL_OFFERS } from "./mockData";
import { safeLocalStorageSet } from "./safe-storage";
import type { Offer } from "./types";

/**
 * CRUD de promoções do painel do restaurante (`/admin/promocoes`) — mesmo
 * desenho de `@/data/menu-store`: funções puras e síncronas, seguras em
 * SSR. As 3 promoções seed (`INITIAL_OFFERS`, sem `restaurantId`) são da
 * Luku e nunca editáveis/apagáveis por aqui — só as criadas por um
 * restaurante (sempre com `restaurantId`) passam por edição/eliminação.
 */

const OFFERS_KEY = "luku_offers_admin";
const CHANGE_EVENT = "luku:menu-changed";

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

/** `false` = a escrita falhou — na prática, a quota do localStorage
 * excedida: a imagem/vídeo da promoção vai em data URL (sem backend real) e
 * pode passar dos ~5 MB. Antes lançava a exceção sem ninguém a apanhar e o
 * formulário ficava parado, sem gravar nem avisar. */
function writeState(state: OffersState): boolean {
  if (typeof window === "undefined") return true;
  const ok = safeLocalStorageSet(OFFERS_KEY, JSON.stringify(state));
  if (ok) window.dispatchEvent(new Event(CHANGE_EVENT));
  return ok;
}

/** Todas as ofertas: seed (Luku) + criadas pelos restaurantes − eliminadas,
 * com edições aplicadas. As edições/eliminações das seed só chegam pela
 * área de sistema (`/sistema/promocoes`); o painel do restaurante nunca
 * lhes mexe. */
export function getEffectiveOffers(): Offer[] {
  const { customOffers, overrides, deletedIds } = readState();
  // Com backend real, um cliente novo não vê nem pode aplicar um código
  // promocional fictício da seed (ligar promoções à API é trabalho
  // futuro — ver auditoria de go-live).
  const fromSeed = hasRealBackend
    ? []
    : INITIAL_OFFERS.filter((o) => !deletedIds.includes(o.id)).map((o) => ({
        ...o,
        ...overrides[o.id],
      }));
  const fromCustom = customOffers
    .filter((o) => !deletedIds.includes(o.id))
    .map((o) => ({ ...o, ...overrides[o.id] }));
  return [...fromSeed, ...fromCustom];
}

/** `null` = não foi possível gravar (ver `writeState`). */
export function createOffer(restaurantId: string, input: OfferInput): Offer | null {
  const state = readState();
  const offer: Offer = { id: `offer-custom-${Date.now()}`, restaurantId, ...input };
  return writeState({ ...state, customOffers: [...state.customOffers, offer] }) ? offer : null;
}

/** Oferta global da Luku — sem `restaurantId`. Criada na área de sistema
 * (`/sistema/promocoes`). */
export function createLukuOffer(input: OfferInput): Offer | null {
  const state = readState();
  const offer = { id: `offer-luku-${Date.now()}`, ...input } as Offer;
  return writeState({ ...state, customOffers: [...state.customOffers, offer] }) ? offer : null;
}

export function updateOffer(id: string, input: OfferInput): boolean {
  const state = readState();
  return writeState({ ...state, overrides: { ...state.overrides, [id]: input } });
}

export function deleteOffer(id: string): boolean {
  const state = readState();
  return writeState({ ...state, deletedIds: [...state.deletedIds, id] });
}

/**
 * Código promocional como o backend o aceita (`alpha_dash`, maiúsculas):
 * só letras, números, `-` e `_`. Aplicado enquanto se escreve — antes, um
 * espaço ("LUKU 20") ou um acento fazia o servidor recusar a promoção.
 */
export function sanitizePromoCode(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 40);
}

/** Efeito resolvido de um código promocional aplicado a um pedido. */
export type PromoEffect = {
  code: string;
  offerId: string;
  /** Título da promoção — mostrado na confirmação e no recibo. */
  label: string;
  /** 0–100. Percentagem descontada do subtotal de produtos. */
  percentOff: number;
  /** Isenta a taxa de entrega. */
  freeDelivery: boolean;
  /** Pratos/categorias alvo — ver `Offer.targetMenuItemIds`/`targetCategories`.
   * Ambos vazios = desconta o pedido inteiro (ver `discountableSubtotal`). */
  targetMenuItemIds: string[];
  targetCategories: string[];
};

/**
 * Resolve um código para o efeito a aplicar num pedido deste restaurante — a
 * própria promoção do restaurante ou uma promoção global da Luku (sem
 * `restaurantId`). `null` = código inexistente ou sem nada a descontar.
 * Case-insensitive.
 */
export function resolvePromoCode(
  restaurantId: string,
  rawCode: string,
  offers: Offer[] = getEffectiveOffers(),
): PromoEffect | null {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;
  const offer = offers.find(
    (o) =>
      o.code?.trim().toUpperCase() === code && (!o.restaurantId || o.restaurantId === restaurantId),
  );
  if (!offer) return null;
  const freeDelivery = offer.type === "delivery";
  const percentOff =
    offer.type === "delivery" ? 0 : Math.max(0, Math.min(100, Math.round(offer.percentOff ?? 0)));
  if (!freeDelivery && percentOff === 0) return null;
  return {
    code,
    offerId: offer.id,
    label: offer.title,
    percentOff,
    freeDelivery,
    targetMenuItemIds: offer.targetMenuItemIds ?? [],
    targetCategories: offer.targetCategories ?? [],
  };
}

/**
 * Subtotal sobre o qual `percentOff` deve ser calculado — sem alvo nenhum
 * (`targetMenuItemIds`/`targetCategories` vazios), é o pedido inteiro (como
 * sempre); com alvo, só as linhas cujo prato/categoria bate entram na soma.
 * Mesma regra usada no backend real (`OrderPricingService::price`) — quem
 * chama já resolveu `lineTotal`/`category` por linha (preço muda conforme o
 * modo/personalização, não é responsabilidade desta função recalcular).
 */
export function discountableSubtotal(
  lines: { menuItemId: string; category: string | undefined; lineTotal: number }[],
  promo: Pick<PromoEffect, "targetMenuItemIds" | "targetCategories">,
): number {
  const hasTarget = promo.targetMenuItemIds.length > 0 || promo.targetCategories.length > 0;
  if (!hasTarget) return lines.reduce((sum, l) => sum + l.lineTotal, 0);
  return lines
    .filter(
      (l) =>
        promo.targetMenuItemIds.includes(l.menuItemId) ||
        (l.category != null && promo.targetCategories.includes(l.category)),
    )
    .reduce((sum, l) => sum + l.lineTotal, 0);
}
