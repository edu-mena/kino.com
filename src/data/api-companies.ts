import { apiFetch } from "@/lib/api-client";
import type { Company } from "./types";

/** Empresas do cliente (nome/NIF/email) — backend/app/Http/Controllers/
 * Api/V1/CompanyController.php. Só usado quando `hasRealBackend`. */

type ApiCompany = { id: string; name: string; nif: string; email: string };

function mapApiCompany(c: ApiCompany): Company {
  return { id: c.id, name: c.name, nif: c.nif, email: c.email };
}

export async function fetchApiCompanies(token: string): Promise<Company[]> {
  const { data } = await apiFetch<{ data: ApiCompany[] }>("/companies", { token });
  return data.map(mapApiCompany);
}

export async function createApiCompany(
  input: { name: string; nif: string; email: string },
  token: string,
): Promise<Company> {
  const { data } = await apiFetch<{ data: ApiCompany }>("/companies", {
    method: "POST",
    token,
    body: input,
  });
  return mapApiCompany(data);
}

export async function updateApiCompany(
  id: string,
  input: { name: string; nif: string; email: string },
  token: string,
): Promise<Company> {
  const { data } = await apiFetch<{ data: ApiCompany }>(`/companies/${id}`, {
    method: "PATCH",
    token,
    body: input,
  });
  return mapApiCompany(data);
}

export async function deleteApiCompany(id: string, token: string): Promise<void> {
  await apiFetch(`/companies/${id}`, { method: "DELETE", token });
}
