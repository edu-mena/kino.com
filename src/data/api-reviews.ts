import { apiFetch } from "@/lib/api-client";
import type { Review } from "./types";

/** Avaliações reais (backend/app/Http/Controllers/Api/V1/ReviewController.php)
 * — só usado quando `hasRealBackend`. Sem suporte a resposta do
 * restaurante no backend ainda (o mock tem `setReviewReply`, mas não há
 * coluna/endpoint para isso na API real) — ver reviews-store.ts. */

type ApiReview = {
  id: string;
  restaurantId?: string;
  customerName: string;
  rating: number;
  date: string;
  comment: string | null;
  tags: string[];
};

function mapApiReview(r: ApiReview): Review {
  return {
    id: r.id,
    restaurantId: r.restaurantId ?? "",
    customerName: r.customerName,
    rating: r.rating,
    date: r.date,
    comment: r.comment ?? "",
    tags: r.tags,
  };
}

export async function fetchApiReviews(restaurantId: string): Promise<Review[]> {
  const { data } = await apiFetch<{ data: ApiReview[] }>(`/restaurants/${restaurantId}/reviews`);
  return data.map((r) => ({ ...mapApiReview(r), restaurantId }));
}

/** `sourceRef` no formato "order:<uuid>" | "reservation:<uuid>" (ver
 * review-dialog.tsx) — traduzido para `ref_type`/`ref_id` da API. Pedidos
 * ainda não estão ligados ao backend real (ver auditoria de go-live), por
 * isso uma review de origem "order:" falha aqui com erro de validação
 * ("Pedido inválido para avaliar") até essa parte ser ligada — comportamento
 * correto: mais vale falhar claramente do que fingir sucesso. */
export async function createApiReview(
  restaurantId: string,
  input: { rating: number; comment: string; tags: string[] },
  sourceRef: string | undefined,
  token: string,
): Promise<Review> {
  const [refType, refId] = sourceRef?.includes(":")
    ? sourceRef.split(":", 2)
    : [undefined, undefined];
  const { data } = await apiFetch<{ data: ApiReview }>(`/restaurants/${restaurantId}/reviews`, {
    method: "POST",
    token,
    body: {
      rating: input.rating,
      comment: input.comment || null,
      tags: input.tags,
      ...(refType && refId ? { ref_type: refType, ref_id: refId } : {}),
    },
  });
  return { ...mapApiReview(data), restaurantId };
}
