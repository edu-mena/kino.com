import { apiFetch } from "@/lib/api-client";
import { mapApiMenuItem } from "./api-restaurants";
import type { MenuItemInput } from "./menu-store";
import type { MenuItem } from "./types";

/** CRUD real de pratos (backend/app/Http/Controllers/Api/V1/MenuItemController.php)
 * — só usado quando `hasRealBackend`. `menu_id` vai como o `uuid` do
 * cardápio (único id que a API expõe, ver api-menus.ts); o controller
 * resolve para o id interno. */

type ApiMenuItem = Parameters<typeof mapApiMenuItem>[0];

function toPayload(input: MenuItemInput) {
  return {
    menu_id: input.menuId,
    name: input.name,
    description: input.description,
    price: input.price,
    category: input.category,
    image_url: input.image || null,
    portion_info: input.portionInfo || null,
    prep_time_minutes: input.prepTimeMinutes || null,
    is_promoted: input.isPromoted ?? false,
    promotion_label: input.promotionLabel ?? null,
    is_buffet_only: input.isBuffetOnly ?? false,
    ingredients: input.ingredients.map((i) => ({
      name: i.name,
      removable: i.removable,
      ...(i.extraPrice != null ? { extra_price: i.extraPrice } : {}),
    })),
  };
}

export async function createApiMenuItem(
  restaurantId: string,
  input: MenuItemInput,
  token: string,
): Promise<MenuItem> {
  const { data } = await apiFetch<{ data: ApiMenuItem }>(
    `/restaurants/${restaurantId}/menu-items`,
    { method: "POST", token, body: toPayload(input) },
  );
  return mapApiMenuItem(data, restaurantId);
}

export async function updateApiMenuItem(
  id: string,
  input: MenuItemInput,
  token: string,
): Promise<MenuItem> {
  const { data } = await apiFetch<{ data: ApiMenuItem }>(`/menu-items/${id}`, {
    method: "PATCH",
    token,
    body: toPayload(input),
  });
  return mapApiMenuItem(data, input.menuId);
}

export async function deleteApiMenuItem(id: string, token: string): Promise<void> {
  await apiFetch(`/menu-items/${id}`, { method: "DELETE", token });
}

export async function setApiMenuItemAvailability(
  id: string,
  restaurantId: string,
  isAvailable: boolean,
  token: string,
): Promise<MenuItem> {
  const { data } = await apiFetch<{ data: ApiMenuItem }>(`/menu-items/${id}`, {
    method: "PATCH",
    token,
    body: { is_available: isAvailable },
  });
  return mapApiMenuItem(data, restaurantId);
}
