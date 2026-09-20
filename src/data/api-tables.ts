import { apiFetch } from "@/lib/api-client";
import type { RestaurantTable } from "./tables-store";

/** CRUD real de mesas
 * (backend/app/Http/Controllers/Api/V1/RestaurantTableController.php) — só
 * usado quando `hasRealBackend`, sempre com `token` (endpoints exigem
 * `manageOperations`, staff do restaurante). */

type ApiTable = { id: string; name: string; seats: number; area: string | null };

function mapApiTable(t: ApiTable, restaurantId: string): RestaurantTable {
  return {
    id: t.id,
    restaurantId,
    name: t.name,
    seats: t.seats,
    ...(t.area ? { area: t.area } : {}),
  };
}

export async function fetchApiTables(
  restaurantId: string,
  token: string,
): Promise<RestaurantTable[]> {
  const { data } = await apiFetch<{ data: ApiTable[] }>(`/restaurants/${restaurantId}/tables`, {
    token,
  });
  return data.map((t) => mapApiTable(t, restaurantId));
}

export async function createApiTable(
  restaurantId: string,
  input: { name: string; seats: number; area?: string },
  token: string,
): Promise<RestaurantTable> {
  const { data } = await apiFetch<{ data: ApiTable }>(`/restaurants/${restaurantId}/tables`, {
    method: "POST",
    token,
    body: input,
  });
  return mapApiTable(data, restaurantId);
}

export async function updateApiTable(
  id: string,
  restaurantId: string,
  patch: Partial<{ name: string; seats: number; area: string }>,
  token: string,
): Promise<RestaurantTable> {
  const { data } = await apiFetch<{ data: ApiTable }>(`/tables/${id}`, {
    method: "PATCH",
    token,
    body: patch,
  });
  return mapApiTable(data, restaurantId);
}

export async function deleteApiTable(id: string, token: string): Promise<void> {
  await apiFetch(`/tables/${id}`, { method: "DELETE", token });
}
