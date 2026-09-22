import { apiFetch } from "@/lib/api-client";
import { dataUrlToFile } from "@/lib/api-upload";
import type { RestaurantStory } from "./types";

/** CRUD real de stories
 * (backend/app/Http/Controllers/Api/V1/StoryController.php) — só usado
 * quando `hasRealBackend`. Media (imagem OU vídeo) vai no próprio pedido de
 * criação, mesmo padrão de `@/data/api-offers`. Stories institucionais da
 * Luku (`restaurantId` nulo) ainda não têm UI própria — descartadas no
 * mapeamento em vez de forçadas num tipo que as não suporta. */

type ApiStory = {
  id: string;
  restaurantId?: string | null;
  mediaUrl: string;
  mediaType: "image" | "video";
  durationSec: number | null;
  processingStatus: string;
  text?: string | null;
  link?: string | null;
  createdAt: string;
};

function hasRestaurantId(s: ApiStory): s is ApiStory & { restaurantId: string } {
  return !!s.restaurantId;
}

function mapApiStory(s: ApiStory & { restaurantId: string }): RestaurantStory {
  return {
    id: s.id,
    restaurantId: s.restaurantId,
    image: s.mediaUrl,
    ...(s.mediaType === "video" ? { mediaType: "video" as const } : {}),
    ...(s.durationSec != null ? { durationSec: s.durationSec } : {}),
    ...(s.text ? { text: s.text } : {}),
    ...(s.link ? { link: s.link } : {}),
    createdAt: s.createdAt,
  };
}

/** Sem `restaurantId`: feed global (institucionais + todos os restaurantes,
 * últimas 24h — usado pelo lado do cliente). Com `restaurantId`: só desse
 * restaurante + institucionais (usado pelo painel do restaurante). */
export async function fetchApiStories(restaurantId?: string): Promise<RestaurantStory[]> {
  const path = restaurantId ? `/restaurants/${restaurantId}/stories` : "/stories";
  const { data } = await apiFetch<{ data: ApiStory[] }>(path);
  return data.filter(hasRestaurantId).map(mapApiStory);
}

export async function createApiStory(
  restaurantId: string,
  input: {
    image: string;
    mediaType?: "image" | "video";
    durationSec?: number;
    text?: string;
    link?: string;
  },
  token: string,
): Promise<RestaurantStory> {
  const body = new FormData();
  const ext = input.mediaType === "video" ? "mp4" : "jpg";
  body.append("media", dataUrlToFile(input.image, `story.${ext}`));
  if (input.durationSec != null) body.append("duration_sec", String(input.durationSec));
  if (input.text) body.append("text", input.text);
  if (input.link) body.append("link", input.link);

  const { data } = await apiFetch<{ data: ApiStory }>(`/restaurants/${restaurantId}/stories`, {
    method: "POST",
    token,
    body,
  });
  // A própria API que acabámos de chamar tem sempre `restaurantId` aqui —
  // é a rota escopada a este restaurante, nunca a global.
  return mapApiStory(data as ApiStory & { restaurantId: string });
}

export async function deleteApiStory(id: string, token: string): Promise<void> {
  await apiFetch(`/stories/${id}`, { method: "DELETE", token });
}
