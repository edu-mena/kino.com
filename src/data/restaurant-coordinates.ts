/**
 * Coordenadas dos restaurantes. O seed (`INITIAL_RESTAURANTS`) não traz
 * lat/lng — `withOverrides` (`@/data/helpers`) preenche-os com
 * `deriveRestaurantCoords`, que coloca cada restaurante perto da capital da
 * sua província com um desvio determinístico a partir do `id`. O gestor pode
 * afinar a localização exata em `/admin/perfil` (guardada no
 * `restaurant-profile-store`).
 */

/** Centros aproximados das 18 províncias de Angola (capital provincial). */
export const PROVINCE_CENTERS: Record<string, { lat: number; lng: number }> = {
  Bengo: { lat: -8.5847, lng: 13.6606 }, // Caxito
  Benguela: { lat: -12.5763, lng: 13.4055 },
  Bié: { lat: -12.3833, lng: 16.9333 }, // Kuito
  Cabinda: { lat: -5.55, lng: 12.2 },
  "Cuando Cubango": { lat: -14.6585, lng: 17.6911 }, // Menongue
  "Cuanza Norte": { lat: -9.2975, lng: 14.9103 }, // N'dalatando
  "Cuanza Sul": { lat: -11.2061, lng: 13.8433 }, // Sumbe
  Cunene: { lat: -16.7969, lng: 15.1053 }, // Ondjiva
  Huambo: { lat: -12.7761, lng: 15.7392 },
  Huíla: { lat: -14.9177, lng: 13.4925 }, // Lubango
  Luanda: { lat: -8.839, lng: 13.2894 },
  "Lunda Norte": { lat: -7.3783, lng: 20.6947 }, // Dundo
  "Lunda Sul": { lat: -9.6608, lng: 20.3919 }, // Saurimo
  Malanje: { lat: -9.5402, lng: 16.341 },
  Moxico: { lat: -11.7833, lng: 19.9167 }, // Luena
  Namibe: { lat: -15.1961, lng: 12.1522 }, // Moçâmedes
  Uíge: { lat: -7.6087, lng: 15.0613 },
  Zaire: { lat: -6.135, lng: 12.3689 }, // M'banza-Kongo
};

const FALLBACK = { lat: -8.839, lng: 13.2894 }; // Luanda

/** Hash FNV-1a — mesmo esquema de `subscriptions-store.ts`. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Coordenada determinística para um restaurante: centro da província +
 * desvio de ≈ ±0.11° (≈ ±12 km) derivado do `id` — espalha os vários
 * restaurantes da mesma cidade em vez de os empilhar num ponto. Estável
 * entre sessões.
 */
export function deriveRestaurantCoords(id: string, province: string): { lat: number; lng: number } {
  const center: { lat: number; lng: number } = PROVINCE_CENTERS[province] ?? FALLBACK;
  const h = hash(id);
  const jitter = (bits: number) => (((h >> bits) & 0xffff) / 0xffff - 0.5) * 0.22;
  return {
    lat: Number((center.lat + jitter(0)).toFixed(5)),
    lng: Number((center.lng + jitter(16)).toFixed(5)),
  };
}
