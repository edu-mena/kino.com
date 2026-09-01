import { safeLocalStorageSet } from "./safe-storage";
import { CHANGE_EVENT, STORAGE_KEYS } from "./storage-keys";
import type { Restaurant } from "./types";
import { defaultWeeklyHours } from "@/lib/opening-hours";

/**
 * Restaurantes criados em runtime — hoje só via aprovação de candidatura em
 * `/sistema/parceiros`. `helpers.ts` funde estes com `INITIAL_RESTAURANTS`,
 * por isso aparecem em toda a app (busca, `/restaurantes`, `/sistema`,
 * login do painel). Store pura e síncrona, segura em SSR.
 */
type CreateInput = {
  name: string;
  cuisine: string;
  neighborhood: string;
  city: string;
  phone: string;
  email: string;
  address?: string;
};

const PLACEHOLDER_COVER =
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=1200&auto=format&fit=crop";

function read(): Restaurant[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.customRestaurants);
    return raw ? (JSON.parse(raw) as Restaurant[]) : [];
  } catch {
    return [];
  }
}

function write(rows: Restaurant[]) {
  if (typeof window === "undefined") return;
  if (safeLocalStorageSet(STORAGE_KEYS.customRestaurants, JSON.stringify(rows))) {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function getCustomRestaurants(): Restaurant[] {
  return read();
}

export function createRestaurant(input: CreateInput): Restaurant {
  const id = `rest-new-${Date.now()}`;
  const restaurant: Restaurant = {
    id,
    name: input.name,
    description: "",
    cuisine: input.cuisine || "Restaurante",
    priceLevel: "Kz Kz",
    rating: 0,
    reviewCount: 0,
    distanceKm: 3,
    address: input.address || "",
    neighborhood: input.neighborhood,
    city: input.city || input.neighborhood,
    phone: input.phone,
    email: input.email,
    openingHours: "",
    coverImage: PLACEHOLDER_COVER,
    galleryImages: [],
    isDeliveryAvailable: false,
    deliveryFee: 0,
    estimatedDeliveryMinutes: 30,
    cautionAmount: 0,
    cautionPolicyNotice: "",
    isFeatured: false,
    acceptsReservations: true,
    reservationSlotMinutes: 120,
    hours: defaultWeeklyHours(),
  };
  write([...read(), restaurant]);
  return restaurant;
}
