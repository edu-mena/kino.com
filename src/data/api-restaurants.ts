import { apiFetch } from "@/lib/api-client";
import type {
  FulfillmentType,
  MenuItem,
  MenuItemIngredient,
  Restaurant,
  WeeklyHours,
} from "./types";

/**
 * Restaurantes/menu vindos da API real (backend/), só usados quando
 * `hasRealBackend` (ver @/lib/api-client) — o resto da app continua a ler
 * `@/data/helpers` (mock/localStorage) quando não há backend configurado
 * (demo em *.vercel.app). Ver `@/data/use-restaurants-query.ts` para os
 * hooks que escolhem entre os dois.
 *
 * O shape que a API devolve (`RestaurantResource`/`MenuItemResource`, ver
 * backend/app/Http/Resources/Api/V1) não bate 1:1 com o tipo `Restaurant`/
 * `MenuItem` que o resto do frontend usa (pensado para o mock) — os campos
 * abaixo fazem essa tradução, com valores por omissão sãos para o que a API
 * pode devolver `null` e o tipo do frontend exige presente.
 */

type ApiRestaurant = {
  id: string;
  name: string;
  description: string | null;
  cuisine: string;
  priceLevel: number | null;
  rating: number | null;
  reviewCount: number;
  address: string | null;
  neighborhood: string;
  city: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  coverImageUrl: string | null;
  isDeliveryAvailable: boolean;
  fulfillmentModes: string[];
  acceptedPaymentMethods: string[];
  cautionModesForOrders: string[];
  deliveryZones: string[];
  deliveryFee: number;
  estimatedDeliveryMinutes: number | null;
  cautionAmount: number;
  cautionPolicyNotice: string | null;
  isFeatured: boolean;
  acceptsReservations: boolean;
  reservationSlotMinutes: number;
  ordersPausedManually: boolean;
  isSuspended: boolean;
  wallpaperUrl?: string | null;
  galleryImages?: { id: number; url: string }[];
  hours?: {
    weekday: number;
    isOpen: boolean;
    ranges: { start: string; end: string }[];
  }[];
};

type ApiMenuItem = {
  id: string;
  // Só vem preenchido se o backend tiver carregado a relação `menu` (ver
  // `whenLoaded` em MenuItemResource.php) — sem isto, todo prato caía no
  // cardápio "sintético" de mock (`defaultMenuId`) em vez do cardápio real,
  // e por isso o PDF/página pública do QR mostravam sempre 0 pratos.
  menuId?: string | null;
  name: string;
  description: string | null;
  price: number | string;
  category: string;
  imageUrl: string | null;
  isAvailable: boolean;
  portionInfo: string | null;
  prepTimeMinutes: number | null;
  isPromoted: boolean;
  promotionLabel: string | null;
  ingredients: { id: string; name: string; removable: boolean; extraPrice?: number }[];
};

// Sem foto própria ainda (restaurantes de demonstração, ver
// backend/database/seeders/DemoRestaurantSeeder.php) — mesma convenção de
// imagens de food-photography que o mock já usa em toda a parte.
const FALLBACK_COVER_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop";
const FALLBACK_DISH_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop";

/** "Kz" repetido N vezes — o frontend usa a string diretamente no ecrã (ver
 * tipo `Restaurant.priceLevel`), a API devolve o nível 1-4 como número. */
function formatPriceLevel(level: number | null): string {
  return Array(Math.max(1, level ?? 1))
    .fill("Kz")
    .join(" ");
}

export function mapApiRestaurant(r: ApiRestaurant): Restaurant {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    cuisine: r.cuisine,
    priceLevel: formatPriceLevel(r.priceLevel),
    rating: r.rating ?? 0,
    reviewCount: r.reviewCount,
    // Sem valor "de seed" para a distância (ao contrário do mock) — quem
    // usa isto sempre recalcula a distância real a partir da morada/GPS do
    // cliente (ver personalizedRestaurantDistanceKm), este é só o fallback.
    distanceKm: 0,
    address: r.address ?? `${r.neighborhood}, ${r.city}`,
    neighborhood: r.neighborhood,
    city: r.city,
    ...(r.lat != null ? { lat: r.lat } : {}),
    ...(r.lng != null ? { lng: r.lng } : {}),
    phone: r.phone ?? "",
    email: r.email ?? "",
    openingHours: "",
    coverImage: r.coverImageUrl ?? FALLBACK_COVER_IMAGE,
    galleryImages: (r.galleryImages ?? []).map((g) => g.url),
    ...(r.galleryImages ? { galleryImageIds: r.galleryImages.map((g) => g.id) } : {}),
    ...(r.wallpaperUrl ? { wallpaper: r.wallpaperUrl } : {}),
    ...(r.hours ? { hours: mapApiHours(r.hours) } : {}),
    isDeliveryAvailable: r.isDeliveryAvailable,
    fulfillmentModes: r.fulfillmentModes as FulfillmentType[],
    acceptedPaymentMethods: r.acceptedPaymentMethods,
    cautionModesForOrders: r.cautionModesForOrders as FulfillmentType[],
    deliveryZones: r.deliveryZones,
    deliveryFee: r.deliveryFee,
    estimatedDeliveryMinutes: r.estimatedDeliveryMinutes ?? 30,
    cautionAmount: r.cautionAmount,
    cautionPolicyNotice: r.cautionPolicyNotice ?? "",
    isFeatured: r.isFeatured,
    acceptsReservations: r.acceptsReservations,
    reservationSlotMinutes: r.reservationSlotMinutes,
    ordersPausedManually: r.ordersPausedManually,
    isSuspended: r.isSuspended,
  };
}

function mapIngredient(i: ApiMenuItem["ingredients"][number]): MenuItemIngredient {
  return {
    id: i.id,
    name: i.name,
    removable: i.removable,
    ...(i.extraPrice != null ? { extraPrice: i.extraPrice } : {}),
  };
}

export function mapApiMenuItem(m: ApiMenuItem, restaurantId: string): MenuItem {
  return {
    id: m.id,
    restaurantId,
    ...(m.menuId ? { menuId: m.menuId } : {}),
    name: m.name,
    description: m.description ?? "",
    price: Number(m.price),
    category: m.category,
    image: m.imageUrl ?? FALLBACK_DISH_IMAGE,
    isAvailable: m.isAvailable,
    portionInfo: m.portionInfo ?? "",
    prepTimeMinutes: m.prepTimeMinutes ?? 0,
    isPromoted: m.isPromoted,
    ...(m.promotionLabel ? { promotionLabel: m.promotionLabel } : {}),
    ingredients: m.ingredients.map(mapIngredient),
  };
}

export async function fetchApiRestaurants(): Promise<Restaurant[]> {
  const { data } = await apiFetch<{ data: ApiRestaurant[] }>("/restaurants");
  return data.map(mapApiRestaurant);
}

export async function fetchApiRestaurant(id: string): Promise<Restaurant | undefined> {
  try {
    const { data } = await apiFetch<{ data: ApiRestaurant }>(`/restaurants/${id}`);
    return mapApiRestaurant(data);
  } catch {
    return undefined;
  }
}

export async function fetchApiMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const { data } = await apiFetch<{ data: ApiMenuItem[] }>(
    `/restaurants/${restaurantId}/menu-items`,
  );
  return data.map((m) => mapApiMenuItem(m, restaurantId));
}

/** Todos os pratos de todos os restaurantes — não há endpoint global no
 * backend (só por restaurante), por isso agrega aqui: lista restaurantes e
 * pede o cardápio de cada um em paralelo. Usado pela busca global
 * (`/cardapio`) e por widgets tipo "Tendências" da home, quando há backend
 * real e nenhum `restaurantId` específico foi pedido. */
export async function fetchApiAllMenuItems(): Promise<MenuItem[]> {
  const restaurants = await fetchApiRestaurants();
  const perRestaurant = await Promise.all(
    restaurants.map((r) => fetchApiMenuItems(r.id).catch(() => [])),
  );
  return perRestaurant.flat();
}

function mapApiHours(days: NonNullable<ApiRestaurant["hours"]>): WeeklyHours {
  const week: WeeklyHours = Array.from({ length: 7 }, () => ({ open: false, ranges: [] }));
  for (const d of days) {
    if (d.weekday < 0 || d.weekday > 6) continue;
    week[d.weekday] = {
      open: d.isOpen,
      ranges: d.ranges.map((r) => ({ start: r.start, end: r.end })),
    };
  }
  return week;
}

/** Payload editável de `/admin/perfil` (ver `saveProfileEdits`, o
 * equivalente mock) — traduzido para os nomes snake_case do
 * `UpdateRestaurantRequest` em `updateApiRestaurant` abaixo. Todos os
 * campos são opcionais (`PATCH` parcial), horário/detalhes de pagamento/
 * galeria têm endpoints próprios (ver funções seguintes), não fazem parte
 * deste PATCH. */
export type RestaurantPatchPayload = Partial<{
  description: string;
  cuisine: string;
  address: string;
  neighborhood: string;
  city: string;
  lat: number;
  lng: number;
  phone: string;
  email: string;
  coverImage: string;
  wallpaper: string;
  isDeliveryAvailable: boolean;
  fulfillmentModes: FulfillmentType[];
  acceptedPaymentMethods: string[];
  cautionModesForOrders: FulfillmentType[];
  deliveryZones: string[];
  deliveryFee: number;
  estimatedDeliveryMinutes: number;
  cautionAmount: number;
  cautionPolicyNotice: string;
  ordersPausedManually: boolean;
}>;

export async function updateApiRestaurant(
  id: string,
  patch: RestaurantPatchPayload,
  token: string,
): Promise<Restaurant> {
  const body: Record<string, unknown> = {};
  if (patch.description !== undefined) body["description"] = patch.description;
  if (patch.cuisine !== undefined) body["cuisine"] = patch.cuisine;
  if (patch.address !== undefined) body["address"] = patch.address;
  if (patch.neighborhood !== undefined) body["neighborhood"] = patch.neighborhood;
  if (patch.city !== undefined) body["city"] = patch.city;
  if (patch.lat !== undefined) body["lat"] = patch.lat;
  if (patch.lng !== undefined) body["lng"] = patch.lng;
  if (patch.phone !== undefined) body["phone"] = patch.phone;
  if (patch.email !== undefined) body["email"] = patch.email;
  if (patch.coverImage !== undefined) body["cover_image_url"] = patch.coverImage;
  if (patch.wallpaper !== undefined) body["wallpaper_url"] = patch.wallpaper;
  if (patch.isDeliveryAvailable !== undefined) {
    body["is_delivery_available"] = patch.isDeliveryAvailable;
  }
  if (patch.fulfillmentModes !== undefined) body["fulfillment_modes"] = patch.fulfillmentModes;
  if (patch.acceptedPaymentMethods !== undefined) {
    body["accepted_payment_methods"] = patch.acceptedPaymentMethods;
  }
  if (patch.cautionModesForOrders !== undefined) {
    body["caution_modes_for_orders"] = patch.cautionModesForOrders;
  }
  if (patch.deliveryZones !== undefined) body["delivery_zones"] = patch.deliveryZones;
  if (patch.deliveryFee !== undefined) body["delivery_fee"] = patch.deliveryFee;
  if (patch.estimatedDeliveryMinutes !== undefined) {
    body["estimated_delivery_minutes"] = patch.estimatedDeliveryMinutes;
  }
  if (patch.cautionAmount !== undefined) body["caution_amount"] = patch.cautionAmount;
  if (patch.cautionPolicyNotice !== undefined) {
    body["caution_policy_notice"] = patch.cautionPolicyNotice;
  }
  if (patch.ordersPausedManually !== undefined) {
    body["orders_paused_manually"] = patch.ordersPausedManually;
  }

  const { data } = await apiFetch<{ data: ApiRestaurant }>(`/restaurants/${id}`, {
    method: "PATCH",
    token,
    body,
  });
  return mapApiRestaurant(data);
}

export async function updateApiRestaurantHours(
  id: string,
  hours: WeeklyHours,
  token: string,
): Promise<void> {
  await apiFetch(`/restaurants/${id}/hours`, {
    method: "PUT",
    token,
    body: {
      days: hours.map((day, weekday) => ({
        weekday,
        is_open: day.open,
        ranges: day.ranges.map((r) => ({ start_time: r.start, end_time: r.end })),
      })),
    },
  });
}

type ApiPaymentDetailRow = { payment_method_code: string; details: string };

/** `showPaymentDetails`/`updatePaymentDetails` não passam por um Resource
 * no backend (ver RestaurantController) — devolvem as colunas do Eloquent
 * tal e qual, em snake_case, ao contrário do resto da API. */
export async function fetchApiRestaurantPaymentDetails(
  id: string,
  token: string,
): Promise<Record<string, string>> {
  const { data } = await apiFetch<{ data: ApiPaymentDetailRow[] }>(
    `/restaurants/${id}/payment-details`,
    { token },
  );
  return Object.fromEntries(data.map((d) => [d.payment_method_code, d.details]));
}

export async function updateApiRestaurantPaymentDetails(
  id: string,
  details: Record<string, string>,
  token: string,
): Promise<Record<string, string>> {
  const { data } = await apiFetch<{ data: ApiPaymentDetailRow[] }>(
    `/restaurants/${id}/payment-details`,
    {
      method: "PUT",
      token,
      body: {
        details: Object.entries(details).map(([payment_method_code, value]) => ({
          payment_method_code,
          details: value,
        })),
      },
    },
  );
  return Object.fromEntries(data.map((d) => [d.payment_method_code, d.details]));
}

export async function addApiGalleryImage(
  id: string,
  file: File,
  token: string,
): Promise<{ id: number; url: string }> {
  const body = new FormData();
  body.append("image", file);
  const { data } = await apiFetch<{ data: { id: number; url: string } }>(
    `/restaurants/${id}/gallery`,
    { method: "POST", token, body },
  );
  return data;
}

export async function removeApiGalleryImage(
  id: string,
  galleryImageId: number,
  token: string,
): Promise<void> {
  await apiFetch(`/restaurants/${id}/gallery/${galleryImageId}`, { method: "DELETE", token });
}
