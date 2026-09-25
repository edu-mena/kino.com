import {
  mapApiRestaurantPackageWithRestaurant,
  type ApiRestaurantPackage,
} from "./api-restaurant-packages";
import { apiFetch } from "@/lib/api-client";
import type { PackageType, RestaurantPackage } from "./types";

/** CRUD real de tipos de pacote
 * (backend/app/Http/Controllers/Api/V1/PackageTypeController.php) — só
 * usado quando `hasRealBackend`. Leitura (`fetchApiPackageTypes`) é pública,
 * mas devolve também os inativos quando chamada com o token do operador de
 * sistema (ver PackageTypeController::index) — usado em `/sistema/pacotes`
 * para poder reativar um tipo desativado. */

type ApiPackageType = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  position: number;
  isActive: boolean;
};

function mapApiPackageType(p: ApiPackageType): PackageType {
  return {
    id: p.id,
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    ...(p.icon ? { icon: p.icon } : {}),
    position: p.position,
    isActive: p.isActive,
  };
}

/** `withOffers`: só tipos com pelo menos um pacote de restaurante ativo —
 * usado pela listagem pública de `/pacotes` (Fase L3d), nunca por
 * `/sistema/pacotes` nem pelo seletor de tipo em `/admin/mesas` (esse
 * precisa de continuar a ver um tipo novo, sem nenhuma oferta ainda). */
export async function fetchApiPackageTypes(
  token?: string | null,
  withOffers?: boolean,
): Promise<PackageType[]> {
  const { data } = await apiFetch<{ data: ApiPackageType[] }>(
    `/package-types${withOffers ? "?with_offers=1" : ""}`,
    { token: token ?? null },
  );
  return data.map(mapApiPackageType);
}

/** Restaurantes ativos que oferecem este tipo de pacote, com resumo do
 * restaurante embutido (nome/imagem/lat/lng) — descoberta pública por tipo
 * (`/pacotes/$packageTypeId`, Fase L3d). Público, sem token. */
export async function fetchApiPackageTypeRestaurants(
  packageTypeId: string,
): Promise<RestaurantPackage[]> {
  const { data } = await apiFetch<{ data: ApiRestaurantPackage[] }>(
    `/package-types/${packageTypeId}/restaurants`,
  );
  return data.map(mapApiRestaurantPackageWithRestaurant);
}

type PackageTypeInput = {
  name: string;
  description?: string;
  icon?: string;
  position?: number;
  isActive?: boolean;
};

// Só transforma `isActive` → `is_active` (o resto já bate certo com o nome
// que o backend espera) — mantém omitidos os campos que o chamador não
// incluiu, para uma edição parcial (ex: só `isActive`) não apagar
// `description`/`icon` sem querer.
function toPayload(input: Partial<PackageTypeInput>) {
  const { isActive, ...rest } = input;
  return {
    ...rest,
    ...(isActive !== undefined ? { is_active: isActive } : {}),
  };
}

export async function createApiPackageType(
  input: PackageTypeInput,
  token: string,
): Promise<PackageType> {
  const { data } = await apiFetch<{ data: ApiPackageType }>("/package-types", {
    method: "POST",
    token,
    body: toPayload(input),
  });
  return mapApiPackageType(data);
}

export async function updateApiPackageType(
  id: string,
  input: Partial<PackageTypeInput>,
  token: string,
): Promise<PackageType> {
  const { data } = await apiFetch<{ data: ApiPackageType }>(`/package-types/${id}`, {
    method: "PATCH",
    token,
    body: toPayload(input),
  });
  return mapApiPackageType(data);
}

export async function deleteApiPackageType(id: string, token: string): Promise<void> {
  await apiFetch(`/package-types/${id}`, { method: "DELETE", token });
}
