import { apiFetch } from "@/lib/api-client";
import type { Courier, CourierVehicle } from "@/lib/couriers";

/** CRUD real de estafetas
 * (backend/app/Http/Controllers/Api/V1/CourierController.php) — só usado
 * quando `hasRealBackend`, sempre com `token` (endpoints exigem
 * `manageOperations`, staff do restaurante). */

type ApiCourier = {
  id: string;
  name: string;
  phone: string;
  vehicle: CourierVehicle;
  zone: string | null;
  status: "disponivel" | "em_entrega" | "offline";
  activeOrderId?: string | null;
};

function mapApiCourier(c: ApiCourier, restaurantId: string): Courier {
  return {
    id: c.id,
    restaurantId,
    name: c.name,
    phone: c.phone,
    vehicle: c.vehicle,
    zone: c.zone ?? "",
    status: c.status,
    ...(c.activeOrderId ? { activeOrderId: c.activeOrderId } : {}),
  };
}

export async function fetchApiCouriers(restaurantId: string, token: string): Promise<Courier[]> {
  const { data } = await apiFetch<{ data: ApiCourier[] }>(`/restaurants/${restaurantId}/couriers`, {
    token,
  });
  return data.map((c) => mapApiCourier(c, restaurantId));
}

export async function createApiCourier(
  restaurantId: string,
  input: { name: string; phone: string; vehicle: CourierVehicle; zone?: string },
  token: string,
): Promise<Courier> {
  const { data } = await apiFetch<{ data: ApiCourier }>(`/restaurants/${restaurantId}/couriers`, {
    method: "POST",
    token,
    body: input,
  });
  return mapApiCourier(data, restaurantId);
}

export async function updateApiCourier(
  id: string,
  restaurantId: string,
  patch: Partial<{ name: string; phone: string; vehicle: CourierVehicle; zone: string }>,
  token: string,
): Promise<Courier> {
  const { data } = await apiFetch<{ data: ApiCourier }>(`/couriers/${id}`, {
    method: "PATCH",
    token,
    body: patch,
  });
  return mapApiCourier(data, restaurantId);
}

export async function setApiCourierStatus(
  id: string,
  restaurantId: string,
  status: "disponivel" | "offline",
  token: string,
): Promise<Courier> {
  const { data } = await apiFetch<{ data: ApiCourier }>(`/couriers/${id}/status`, {
    method: "PATCH",
    token,
    body: { status },
  });
  return mapApiCourier(data, restaurantId);
}

export async function deleteApiCourier(id: string, token: string): Promise<void> {
  await apiFetch(`/couriers/${id}`, { method: "DELETE", token });
}
