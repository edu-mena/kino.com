import { apiFetch } from "@/lib/api-client";

/** Pratos e bebidas favoritos — backend/app/Http/Controllers/Api/V1/
 * FavoriteMenuItemController.php. Todas as rotas devolvem a lista completa
 * de ids atualizada (mais recente primeiro). Só com `hasRealBackend`. */

export async function fetchApiFavoriteMenuItems(token: string): Promise<string[]> {
  const { data } = await apiFetch<{ data: string[] }>("/favorites/menu-items", { token });
  return data;
}

export async function favoriteApiMenuItem(id: string, token: string): Promise<string[]> {
  const { data } = await apiFetch<{ data: string[] }>(`/menu-items/${id}/favorite`, {
    method: "POST",
    token,
  });
  return data;
}

export async function unfavoriteApiMenuItem(id: string, token: string): Promise<string[]> {
  const { data } = await apiFetch<{ data: string[] }>(`/menu-items/${id}/favorite`, {
    method: "DELETE",
    token,
  });
  return data;
}

/** Junta os favoritos guardados no browser (ex: de antes de entrar) aos da
 * conta — nunca apaga os que já lá estavam. */
export async function syncApiFavoriteMenuItems(ids: string[], token: string): Promise<string[]> {
  const { data } = await apiFetch<{ data: string[] }>("/favorites/menu-items/sync", {
    method: "POST",
    token,
    body: { ids: ids.slice(0, 200) },
  });
  return data;
}
