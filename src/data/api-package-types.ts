import { apiFetch } from "@/lib/api-client";
import type { PackageType } from "./types";

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

export async function fetchApiPackageTypes(token?: string | null): Promise<PackageType[]> {
  const { data } = await apiFetch<{ data: ApiPackageType[] }>("/package-types", {
    token: token ?? null,
  });
  return data.map(mapApiPackageType);
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
