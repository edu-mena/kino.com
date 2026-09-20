import { apiFetch } from "@/lib/api-client";
import type { FulfillmentType, MenuItem, MenuItemIngredient, Restaurant } from "./types";

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
};

type ApiMenuItem = {
  id: string;
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
    galleryImages: [],
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
