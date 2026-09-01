import { INITIAL_REVIEWS } from "./mockData";
import { safeLocalStorageSet } from "./safe-storage";
import { CHANGE_EVENT, STORAGE_KEYS } from "./storage-keys";
import type { Review } from "./types";

/**
 * Avaliações — seed (`INITIAL_REVIEWS`) + as que os clientes deixam depois de
 * um pedido entregue ou reserva cumprida. Store pura e síncrona, segura em
 * SSR, mesmo desenho de `offers-store.ts`.
 */
type NewReview = {
  restaurantId: string;
  rating: number;
  comment: string;
  customerName: string;
  tags?: string[];
};

type ReviewsState = {
  custom: Review[];
  /** refs já avaliadas: "order:<id>" / "reservation:<id>" — evita repetir. */
  reviewed: string[];
};

const EMPTY: ReviewsState = { custom: [], reviewed: [] };

function read(): ReviewsState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.reviews);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(state: ReviewsState) {
  if (typeof window === "undefined") return;
  if (safeLocalStorageSet(STORAGE_KEYS.reviews, JSON.stringify(state))) {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function getEffectiveReviews(): Review[] {
  return [...INITIAL_REVIEWS, ...read().custom];
}

export function getCustomReviews(): Review[] {
  return read().custom;
}

export function isRefReviewed(ref: string): boolean {
  return read().reviewed.includes(ref);
}

export function addReview(input: NewReview, ref?: string): Review {
  const state = read();
  const review: Review = {
    id: `rev-custom-${Date.now()}`,
    restaurantId: input.restaurantId,
    customerName: input.customerName,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    date: new Date().toISOString().slice(0, 10),
    comment: input.comment.trim(),
    tags: input.tags ?? [],
  };
  write({
    custom: [review, ...state.custom],
    reviewed: ref && !state.reviewed.includes(ref) ? [...state.reviewed, ref] : state.reviewed,
  });
  return review;
}

/** Rating/contagem do restaurante já com as avaliações custom misturadas. */
export function blendedRating(
  restaurantId: string,
  seedRating: number,
  seedCount: number,
): { rating: number; reviewCount: number } {
  const custom = read().custom.filter((r) => r.restaurantId === restaurantId);
  if (custom.length === 0) return { rating: seedRating, reviewCount: seedCount };
  const total = seedRating * seedCount + custom.reduce((s, r) => s + r.rating, 0);
  const count = seedCount + custom.length;
  return { rating: Math.round((total / count) * 10) / 10, reviewCount: count };
}
