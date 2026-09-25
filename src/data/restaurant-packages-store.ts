import { getRestaurant } from "./helpers";
import { getEffectivePackageTypes } from "./package-types-store";
import { safeLocalStorageSet } from "./safe-storage";
import type { RestaurantPackage } from "./types";

/**
 * Pacotes de consumo que cada restaurante oferece — geridos em
 * `/admin/mesas`. Mesmo desenho de `tables-store.ts`: store pura e
 * síncrona, segura em SSR, sem dados de seed (ao contrário de mesas, não
 * há histórico de demonstração pré-existente pra isto). Guarda só
 * `packageTypeId` — `packageType` (nome/ícone) é resolvido a partir de
 * `package-types-store` a cada leitura, igual à relação Eloquent no
 * backend real, para refletir sempre o nome/ícone atual do tipo.
 */
export type RestaurantPackageInput = {
  restaurantId: string;
  packageTypeId: string;
  title?: string;
  description?: string;
  price: number;
  maxPeople?: number;
  characteristics: string[];
  isActive: boolean;
};

type StoredPackage = RestaurantPackageInput & { id: string };

const KEY = "luku_restaurant_packages_v1";
const CHANGE_EVENT = "luku:menu-changed";

function read(): StoredPackage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored ? (JSON.parse(stored) as StoredPackage[]) : [];
  } catch {
    return [];
  }
}

function write(rows: StoredPackage[]): boolean {
  if (typeof window === "undefined") return true;
  const ok = safeLocalStorageSet(KEY, JSON.stringify(rows));
  if (ok) window.dispatchEvent(new Event(CHANGE_EVENT));
  return ok;
}

/** `null` quando o tipo referenciado já não existe (apagado em
 * `/sistema/pacotes`) — mesmo comportamento do cascade real no backend,
 * o pacote deixa de aparecer em vez de mostrar dados incompletos. */
function toPublic(row: StoredPackage): RestaurantPackage | null {
  const type = getEffectivePackageTypes().find((t) => t.id === row.packageTypeId);
  if (!type) return null;
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    packageType: { id: type.id, name: type.name, ...(type.icon ? { icon: type.icon } : {}) },
    ...(row.title ? { title: row.title } : {}),
    ...(row.description ? { description: row.description } : {}),
    price: row.price,
    ...(row.maxPeople != null ? { maxPeople: row.maxPeople } : {}),
    characteristics: row.characteristics,
    isActive: row.isActive,
  };
}

export function getRestaurantPackages(): RestaurantPackage[] {
  return read()
    .map(toPublic)
    .filter((p): p is RestaurantPackage => p !== null);
}

export function getRestaurantPackagesByRestaurant(restaurantId: string): RestaurantPackage[] {
  return getRestaurantPackages().filter((p) => p.restaurantId === restaurantId);
}

/** Pacotes ativos de UM tipo, de qualquer restaurante, com o resumo do
 * restaurante embutido (nome/imagem/lat/lng) — descoberta pública por tipo
 * (`/pacotes/$packageTypeId`, Fase L3d), mesmo shape do backend real (ver
 * `mapApiRestaurantPackageWithRestaurant`). Um restaurante entretanto
 * apagado (`getRestaurant` devolve `undefined`) fica de fora, em vez de
 * mostrar um pacote sem dono. */
export function getRestaurantPackagesByType(packageTypeId: string): RestaurantPackage[] {
  return getRestaurantPackages()
    .filter((p) => p.isActive && p.packageType.id === packageTypeId)
    .map((p): RestaurantPackage | null => {
      const restaurant = getRestaurant(p.restaurantId);
      if (!restaurant) return null;
      return {
        ...p,
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          image: restaurant.coverImage,
          ...(restaurant.lat != null ? { lat: restaurant.lat } : {}),
          ...(restaurant.lng != null ? { lng: restaurant.lng } : {}),
        },
      };
    })
    .filter((p): p is RestaurantPackage => p !== null);
}

export function addRestaurantPackage(input: RestaurantPackageInput) {
  write([...read(), { ...input, id: `pkg-${input.restaurantId}-${Date.now()}` }]);
}

export function updateRestaurantPackage(
  id: string,
  patch: Partial<Omit<RestaurantPackageInput, "restaurantId">>,
) {
  write(read().map((row) => (row.id === id ? { ...row, ...patch } : row)));
}

export function removeRestaurantPackage(id: string) {
  write(read().filter((row) => row.id !== id));
}
