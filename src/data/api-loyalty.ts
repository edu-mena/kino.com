import { apiFetch } from "@/lib/api-client";
import type { LoyaltyTier } from "@/lib/loyalty";

/** Clientes Gold/Platina — backend/app/Http/Controllers/Api/V1/CustomerLoyaltyController.php.
 * Só com `hasRealBackend`. */

export type ApiCustomerLoyalty = {
  key: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  spend: number;
  tier: LoyaltyTier;
};

export async function fetchApiRestaurantLoyalty(
  restaurantId: string,
  token: string,
): Promise<ApiCustomerLoyalty[]> {
  const { data } = await apiFetch<{ data: { customers: ApiCustomerLoyalty[] } }>(
    `/restaurants/${restaurantId}/customer-loyalty`,
    { token },
  );
  return data.customers;
}

export type ApiOwnLoyalty = {
  restaurantId: string;
  spend: number;
  tier: LoyaltyTier;
};

export async function fetchApiOwnLoyalty(token: string): Promise<ApiOwnLoyalty[]> {
  const { data } = await apiFetch<{ data: { restaurants: ApiOwnLoyalty[] } }>("/loyalty", {
    token,
  });
  return data.restaurants;
}
