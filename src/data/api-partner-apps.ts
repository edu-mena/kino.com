import { apiFetch } from "@/lib/api-client";
import { mapApiRestaurant } from "./api-restaurants";
import type { Restaurant } from "./types";
import type { PartnerApplication, PartnerAppStatus } from "./partner-apps-store";

/**
 * Candidaturas de parceiro vindas da API real (backend/) — só usado quando
 * `hasRealBackend` (ver @/lib/api-client). Endpoints system_operator-only
 * (ver backend/app/Http/Controllers/Api/V1/PartnerApplicationController.php),
 * por isso todas as funções aqui exigem `token`.
 */

type ApiPartnerApplication = PartnerApplication & { createdRestaurantId?: string | null };

// Mesmo shape de ApiRestaurant em api-restaurants.ts — RestaurantResource
// devolve isto quer venha de /restaurants quer de partner-applications/{id}/approve.
type ApiRestaurant = Parameters<typeof mapApiRestaurant>[0];

export async function fetchApiPartnerApplications(
  token: string,
): Promise<PartnerApplication[]> {
  const { data } = await apiFetch<{ data: ApiPartnerApplication[] }>("/partner-applications", {
    token,
  });
  return data;
}

export async function approveApiPartnerApplication(
  id: string,
  token: string,
): Promise<Restaurant> {
  const { data } = await apiFetch<{ data: ApiRestaurant }>(
    `/partner-applications/${id}/approve`,
    { method: "POST", token },
  );
  return mapApiRestaurant(data);
}

export async function rejectApiPartnerApplication(id: string, token: string): Promise<void> {
  await apiFetch(`/partner-applications/${id}/reject`, { method: "POST", token });
}

export async function deleteApiPartnerApplication(id: string, token: string): Promise<void> {
  await apiFetch(`/partner-applications/${id}`, { method: "DELETE", token });
}

export type { PartnerAppStatus };
