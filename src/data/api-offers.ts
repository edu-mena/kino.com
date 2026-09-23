import { apiFetch } from "@/lib/api-client";
import { dataUrlToFile } from "@/lib/api-upload";
import type { Offer } from "./types";

/** CRUD real de promoções
 * (backend/app/Http/Controllers/Api/V1/OfferController.php) — só usado
 * quando `hasRealBackend`. Ao contrário de pratos (que sobem a imagem para
 * `/uploads` à parte), o media da promoção (imagem OU vídeo, com
 * transcodificação assíncrona no backend) vai junto no próprio pedido de
 * criação/edição — por isso as funções aqui recebem sempre `token`. */

type ApiOffer = {
  id: string;
  restaurantId?: string | null;
  type: "discount" | "delivery" | "happy-hour";
  title: string;
  description: string | null;
  code: string | null;
  percentOff: number | null;
  imageUrl: string | null;
  mediaType: "image" | "video";
  thumbnailUrl: string | null;
  layout: "split" | "cover" | null;
  targetMenuItemIds: string[];
  targetCategories: string[];
  processingStatus: string;
  startsAt: string | null;
  endsAt: string | null;
};

function mapApiOffer(o: ApiOffer): Offer {
  return {
    id: o.id,
    ...(o.restaurantId ? { restaurantId: o.restaurantId } : {}),
    type: o.type,
    title: o.title,
    description: o.description ?? "",
    ...(o.code ? { code: o.code } : {}),
    ...(o.percentOff != null ? { percentOff: o.percentOff } : {}),
    ...(o.imageUrl ? { image: o.imageUrl } : {}),
    ...(o.mediaType === "video" ? { mediaType: "video" as const } : {}),
    ...(o.thumbnailUrl ? { thumbnail: o.thumbnailUrl } : {}),
    ...(o.layout ? { layout: o.layout } : {}),
    ...(o.targetMenuItemIds.length ? { targetMenuItemIds: o.targetMenuItemIds } : {}),
    ...(o.targetCategories.length ? { targetCategories: o.targetCategories } : {}),
  };
}

export async function fetchApiOffers(restaurantId?: string): Promise<Offer[]> {
  const path = restaurantId ? `/restaurants/${restaurantId}/offers` : "/offers";
  const { data } = await apiFetch<{ data: ApiOffer[] }>(path);
  return data.map(mapApiOffer);
}

type OfferInput = {
  type: "discount" | "delivery" | "happy-hour";
  title: string;
  description: string;
  code?: string;
  percentOff?: number;
  layout?: "split" | "cover";
  /** Pratos/categorias alvo — ver `Offer.targetMenuItemIds`/`targetCategories`
   * (`@/data/types`). Sempre enviados (mesmo `[]`) quando a promoção é do
   * restaurante, para uma edição conseguir LIMPAR uma seleção anterior. */
  menuItemIds?: string[];
  categories?: string[];
  /** Data URL (imagem ou vídeo) — só enviada se tiver mudado desde o
   * carregamento (evita reenviar/reprocessar o mesmo ficheiro a cada
   * edição de texto). */
  media?: { dataUrl: string; mediaType: "image" | "video" };
};

function buildFormData(input: OfferInput): FormData {
  const body = new FormData();
  body.append("type", input.type);
  body.append("title", input.title);
  if (input.description) body.append("description", input.description);
  if (input.code) body.append("code", input.code);
  if (input.percentOff != null) body.append("percent_off", String(input.percentOff));
  if (input.layout) body.append("layout", input.layout);
  // Um campo JSON só, em vez de `menu_item_ids[]` repetido — multipart não
  // tem forma de representar um array VAZIO (zero entradas = nenhuma chave
  // chega ao PHP), e uma edição precisa de conseguir LIMPAR uma seleção
  // anterior, não só adicionar (ver StoreOfferRequest::prepareForValidation).
  if (input.menuItemIds) body.append("menu_item_ids", JSON.stringify(input.menuItemIds));
  if (input.categories) body.append("categories", JSON.stringify(input.categories));
  if (input.media) {
    const ext = input.media.mediaType === "video" ? "mp4" : "jpg";
    body.append("media", dataUrlToFile(input.media.dataUrl, `promo.${ext}`));
  }
  return body;
}

export async function createApiOffer(
  restaurantId: string | null,
  input: OfferInput,
  token: string,
): Promise<Offer> {
  const path = restaurantId ? `/restaurants/${restaurantId}/offers` : "/offers";
  const { data } = await apiFetch<{ data: ApiOffer }>(path, {
    method: "POST",
    token,
    body: buildFormData(input),
  });
  return mapApiOffer(data);
}

export async function updateApiOffer(id: string, input: OfferInput, token: string): Promise<Offer> {
  const { data } = await apiFetch<{ data: ApiOffer }>(`/offers/${id}`, {
    method: "POST",
    token,
    body: buildFormData(input),
  });
  return mapApiOffer(data);
}

export async function deleteApiOffer(id: string, token: string): Promise<void> {
  await apiFetch(`/offers/${id}`, { method: "DELETE", token });
}
