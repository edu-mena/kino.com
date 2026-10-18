import { apiFetch } from "@/lib/api-client";

/** Restaurantes gerados em lote (`php artisan restaurants:seed-demo`) —
 * backend/app/Http/Controllers/Api/V1/SystemSeededRestaurantController.php.
 * Todas as ações só tocam restaurantes do lote, nunca um real. */
export type SeededRestaurant = {
  id: string;
  name: string;
  cuisine: string | null;
  province: string | null;
  neighborhood: string | null;
  batch: string;
  active: boolean;
  modes: ("delivery" | "takeaway" | "dinein")[];
  acceptsReservations: boolean;
  menuItems: number;
  ownerEmail: string | null;
};

export type SeededSelection = { all: true } | { ids: string[] };

export async function fetchSeededRestaurants(token: string): Promise<SeededRestaurant[]> {
  const { data } = await apiFetch<{ data: SeededRestaurant[] }>("/system/seeded-restaurants", {
    token,
  });
  return data;
}

export async function setSeededRestaurantsActive(
  selection: SeededSelection,
  active: boolean,
  token: string,
): Promise<number> {
  const { data } = await apiFetch<{ data: { updated: number } }>(
    `/system/seeded-restaurants/${active ? "activate" : "deactivate"}`,
    { method: "POST", token, body: selection },
  );
  return data.updated;
}

export async function deleteSeededRestaurants(
  selection: SeededSelection,
  token: string,
): Promise<number> {
  const { data } = await apiFetch<{ data: { deleted: number } }>(
    "/system/seeded-restaurants/delete",
    { method: "POST", token, body: selection },
  );
  return data.deleted;
}
