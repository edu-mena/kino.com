import { apiFetch } from "@/lib/api-client";
import type { RestaurantMenu } from "./types";

/** Cardápios nomeados de um restaurante, vindos da API real — só usado
 * quando `hasRealBackend` (ver @/lib/api-client). Endpoints em
 * backend/app/Http/Controllers/Api/V1/RestaurantMenuController.php. */

type ApiRestaurantMenu = {
  id: string;
  restaurantId?: string;
  name: string;
  isActive: boolean;
  category: string | null;
};

function mapApiMenu(m: ApiRestaurantMenu, restaurantId: string): RestaurantMenu {
  return {
    id: m.id,
    restaurantId,
    name: m.name,
    isActive: m.isActive,
    ...(m.category ? { category: m.category } : {}),
  };
}

export async function fetchApiMenus(restaurantId: string): Promise<RestaurantMenu[]> {
  const { data } = await apiFetch<{ data: ApiRestaurantMenu[] }>(
    `/restaurants/${restaurantId}/menus`,
  );
  return data.map((m) => mapApiMenu(m, restaurantId));
}
