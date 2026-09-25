import { apiFetch } from "@/lib/api-client";
import type { RestaurantPackage } from "./types";

/** CRUD real de pacotes de restaurante
 * (backend/app/Http/Controllers/Api/V1/RestaurantPackageController.php) —
 * só usado quando `hasRealBackend`. A listagem é pública mas devolve mais
 * (inclui inativos) quando pedida com o token de staff do próprio
 * restaurante — por isso `fetchApiRestaurantPackages` aceita `token`
 * opcional, ao contrário do CRUD de escrita, que exige sempre. */

export type ApiRestaurantPackage = {
  id: string;
  restaurantId?: string;
  restaurant?: {
    id: string;
    name: string;
    image: string | null;
    lat: number | null;
    lng: number | null;
  };
  packageType?: { id: string; name: string; icon: string | null };
  title: string | null;
  description: string | null;
  price: number | string;
  maxPeople: number | null;
  characteristics: string[];
  isActive: boolean;
};

function mapApiRestaurantPackage(p: ApiRestaurantPackage, restaurantId: string): RestaurantPackage {
  return {
    id: p.id,
    restaurantId,
    packageType: {
      id: p.packageType?.id ?? "",
      name: p.packageType?.name ?? "",
      ...(p.packageType?.icon ? { icon: p.packageType.icon } : {}),
    },
    ...(p.title ? { title: p.title } : {}),
    ...(p.description ? { description: p.description } : {}),
    price: Number(p.price),
    ...(p.maxPeople != null ? { maxPeople: p.maxPeople } : {}),
    characteristics: p.characteristics,
    isActive: p.isActive,
  };
}

/** Mesmo mapeamento acima, mas para a descoberta pública por tipo de
 * pacote (`fetchApiPackageTypeRestaurants`, `@/data/api-package-types`) —
 * aí não há um `restaurantId` já conhecido de antemão (cada linha é de um
 * restaurante diferente), por isso deriva-se do `restaurant` embutido, que
 * este endpoint sempre carrega. */
export function mapApiRestaurantPackageWithRestaurant(p: ApiRestaurantPackage): RestaurantPackage {
  const base = mapApiRestaurantPackage(p, p.restaurant?.id ?? "");
  if (!p.restaurant) return base;
  return {
    ...base,
    restaurant: {
      id: p.restaurant.id,
      name: p.restaurant.name,
      ...(p.restaurant.image ? { image: p.restaurant.image } : {}),
      ...(p.restaurant.lat != null ? { lat: p.restaurant.lat } : {}),
      ...(p.restaurant.lng != null ? { lng: p.restaurant.lng } : {}),
    },
  };
}

export async function fetchApiRestaurantPackages(
  restaurantId: string,
  token?: string | null,
): Promise<RestaurantPackage[]> {
  const { data } = await apiFetch<{ data: ApiRestaurantPackage[] }>(
    `/restaurants/${restaurantId}/packages`,
    { token: token ?? null },
  );
  return data.map((p) => mapApiRestaurantPackage(p, restaurantId));
}

type RestaurantPackageInput = {
  packageTypeId: string;
  title?: string;
  description?: string;
  price: number;
  maxPeople?: number;
  characteristics?: string[];
  isActive?: boolean;
};

function toPayload(input: Partial<RestaurantPackageInput>) {
  const { packageTypeId, isActive, ...rest } = input;
  return {
    ...rest,
    ...(packageTypeId !== undefined ? { package_type_id: packageTypeId } : {}),
    ...(isActive !== undefined ? { is_active: isActive } : {}),
  };
}

export async function createApiRestaurantPackage(
  restaurantId: string,
  input: RestaurantPackageInput,
  token: string,
): Promise<RestaurantPackage> {
  const { data } = await apiFetch<{ data: ApiRestaurantPackage }>(
    `/restaurants/${restaurantId}/packages`,
    { method: "POST", token, body: toPayload(input) },
  );
  return mapApiRestaurantPackage(data, restaurantId);
}

export async function updateApiRestaurantPackage(
  id: string,
  restaurantId: string,
  patch: Partial<RestaurantPackageInput>,
  token: string,
): Promise<RestaurantPackage> {
  const { data } = await apiFetch<{ data: ApiRestaurantPackage }>(`/restaurant-packages/${id}`, {
    method: "PATCH",
    token,
    body: toPayload(patch),
  });
  return mapApiRestaurantPackage(data, restaurantId);
}

export async function deleteApiRestaurantPackage(id: string, token: string): Promise<void> {
  await apiFetch(`/restaurant-packages/${id}`, { method: "DELETE", token });
}
