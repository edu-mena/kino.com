import { useEffect, useState } from "react";
import { fetchApiReviews } from "./api-reviews";
import { getReviewsForRestaurant } from "./helpers";
import { hasRealBackend } from "@/lib/api-client";
import type { Review } from "./types";

/**
 * Avaliações de um restaurante, reativo a respostas/criações no mock (via
 * `luku:menu-changed`/`storage`) — mesmo padrão SSR-safe de
 * `@/data/use-menu-items`. Com backend real, busca a lista de verdade da
 * API, já com a resposta do restaurante quando existir (ver
 * @/data/api-reviews) — o mesmo `luku:menu-changed` disparado por
 * `setReviewReply` (reviews-store.ts) faz isto voltar a buscar.
 */
export function useReviews(restaurantId: string | undefined): Review[] {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!restaurantId) return;
    const sync = () => {
      if (hasRealBackend) {
        fetchApiReviews(restaurantId)
          .then(setReviews)
          .catch(() => setReviews([]));
      } else {
        setReviews(getReviewsForRestaurant(restaurantId));
      }
    };
    sync();
    window.addEventListener("luku:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("luku:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [restaurantId]);

  return reviews;
}
