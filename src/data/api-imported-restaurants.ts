import { apiFetch } from "@/lib/api-client";

/** Restaurantes pré-cadastrados a partir do menus.ao — só operadores de
 * sistema (backend/app/Http/Controllers/Api/V1/SystemImportedRestaurantController.php). */

export type ImportStatus = "pending" | "active" | "discarded";

export type ImportedRestaurant = {
  id: string;
  name: string;
  address: string | null;
  province: string | null;
  cuisine: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  isPublished: boolean;
  itemCount: number;
  source: { slug: string; url: string };
  contactPhone: string | null;
  contactEmail: string | null;
  stats: {
    items?: number;
    categories?: number;
    images?: number;
    skippedNoPrice?: number;
    /** Pratos com ingredientes reconhecidos (`menus-ao:ingredients`). */
    withIngredients?: number;
    instagram?: string | null;
  };
  syncedAt: string | null;
  activatedAt: string | null;
  discardedAt: string | null;
};

export type ImportedRestaurantDetail = ImportedRestaurant & {
  hours: { weekday: number; isOpen: boolean; ranges: { start: string; end: string }[] }[];
  categories: {
    name: string;
    items: {
      id: string;
      name: string;
      description: string | null;
      price: number;
      imageUrl: string | null;
      /** Reconhecidos na descrição (principais, sem preço). */
      ingredients?: string[];
    }[];
  }[];
};

export type ImportCounts = Record<ImportStatus, number>;

export async function fetchImportedRestaurants(
  status: ImportStatus,
  token: string,
): Promise<{ data: ImportedRestaurant[]; counts: ImportCounts }> {
  return apiFetch(`/system/imported-restaurants?status=${status}`, { token });
}

export async function fetchImportedRestaurant(
  id: string,
  token: string,
): Promise<ImportedRestaurantDetail> {
  const { data } = await apiFetch<{ data: ImportedRestaurantDetail }>(
    `/system/imported-restaurants/${id}`,
    { token },
  );
  return data;
}

export type ActivationInput = {
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  publicPhone?: string;
  publicEmail?: string;
};

export async function activateImportedRestaurant(
  id: string,
  input: ActivationInput,
  token: string,
): Promise<ImportedRestaurant> {
  const { data } = await apiFetch<{ data: ImportedRestaurant }>(
    `/system/imported-restaurants/${id}/activate`,
    {
      method: "POST",
      token,
      body: {
        owner_name: input.ownerName,
        owner_email: input.ownerEmail,
        ...(input.ownerPhone ? { owner_phone: input.ownerPhone } : {}),
        ...(input.publicPhone ? { public_phone: input.publicPhone } : {}),
        ...(input.publicEmail ? { public_email: input.publicEmail } : {}),
      },
    },
  );
  return data;
}

export async function discardImportedRestaurant(id: string, token: string): Promise<void> {
  await apiFetch(`/system/imported-restaurants/${id}`, { method: "DELETE", token });
}

export async function restoreImportedRestaurant(id: string, token: string): Promise<void> {
  await apiFetch(`/system/imported-restaurants/${id}/restore`, { method: "POST", token });
}
