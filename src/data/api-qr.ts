import { apiFetch } from "@/lib/api-client";
import { normalizeQrStyle, type QrStyle } from "@/lib/qr-style";

/** QR impressos — ver backend/app/Http/Controllers/Api/V1/QrCodeController.php. */

export type RestaurantQrInfo = {
  /** Código do QR geral (montra, balcão, flyers) — sem mesa. */
  code: string;
  scans: number;
  /** Todas as leituras do restaurante (QR geral + mesas, incl. apagadas). */
  totalScans: number;
  style: QrStyle;
};

export async function fetchApiRestaurantQr(
  restaurantId: string,
  token: string,
): Promise<RestaurantQrInfo> {
  const { data } = await apiFetch<{
    data: {
      restaurant: { code: string; scans: number };
      totalScans: number;
      style: unknown;
    };
  }>(`/restaurants/${restaurantId}/qr-codes`, { token });
  return {
    code: data.restaurant.code,
    scans: data.restaurant.scans,
    totalScans: data.totalScans,
    style: normalizeQrStyle(data.style),
  };
}

export async function saveApiQrStyle(
  restaurantId: string,
  style: QrStyle,
  token: string,
): Promise<void> {
  await apiFetch(`/restaurants/${restaurantId}/qr-style`, {
    method: "PUT",
    token,
    body: { style },
  });
}

/** O que o telemóvel do cliente recebe ao abrir `luku.ao/q/{code}`. */
export type ResolvedQr = {
  code: string;
  kind: "restaurant" | "table";
  restaurant: {
    id: string;
    name: string;
    cuisine?: string;
    coverImage?: string;
    logo?: string;
    rating?: number;
    reviewCount?: number;
  };
  table: { id: string; name: string; area?: string; seats: number } | null;
  /** Outras mesas juntas hoje a esta (ex.: ["Mesa 3"]). */
  combinedWith: string[];
};

export async function resolveApiQr(code: string, preview = false): Promise<ResolvedQr> {
  const { data } = await apiFetch<{
    data: {
      code: string;
      kind: "restaurant" | "table";
      restaurant: {
        id: string;
        name: string;
        cuisine: string | null;
        coverImageUrl: string | null;
        logoUrl: string | null;
        rating: number | null;
        reviewCount: number | null;
      };
      table: { id: string; name: string; area: string | null; seats: number } | null;
      combinedWith: string[];
    };
  }>(`/qr/${encodeURIComponent(code)}${preview ? "?preview=1" : ""}`);
  const r = data.restaurant;
  return {
    code: data.code,
    kind: data.kind,
    restaurant: {
      id: r.id,
      name: r.name,
      ...(r.cuisine ? { cuisine: r.cuisine } : {}),
      ...(r.coverImageUrl ? { coverImage: r.coverImageUrl } : {}),
      ...(r.logoUrl ? { logo: r.logoUrl } : {}),
      ...(r.rating != null ? { rating: r.rating } : {}),
      ...(r.reviewCount != null ? { reviewCount: r.reviewCount } : {}),
    },
    table: data.table
      ? {
          id: data.table.id,
          name: data.table.name,
          seats: data.table.seats,
          ...(data.table.area ? { area: data.table.area } : {}),
        }
      : null,
    combinedWith: data.combinedWith ?? [],
  };
}
