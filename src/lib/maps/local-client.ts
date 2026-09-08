import { PROVINCE_CENTERS } from "@/data/restaurant-coordinates";
import { haversineKm } from "@/lib/geo";
import type { GeocodeResult, MapsClient, RouteRequest, RouteResult } from "./types";
import type { LatLng } from "./types";

/**
 * Implementação sem rede — o comportamento atual do app, agora atrás do
 * mesmo contrato que o cliente Google vai cumprir.
 *
 * - `geocode`  → procura o nome de uma província e devolve o seu centro.
 * - `route`    → distância haversine + velocidade média urbana. Sem ruas,
 *                sem rio, sem trânsito. `approximate: true` sempre.
 *
 * Expõe também variantes SÍNCRONAS (`routeSync`/`geocodeSync`) para os
 * ecrãs manterem render imediato e SSR-safe enquanto o caminho real não
 * está ligado — ver `use-travel-estimate.ts`.
 */

/** Velocidade média de condução assumida em meio urbano (km/h). */
const AVG_URBAN_SPEED_KMH = 20;

function matchProvince(query: string): string | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return Object.keys(PROVINCE_CENTERS).find(
    (name) => q === name.toLowerCase() || q.includes(name.toLowerCase()),
  );
}

function nearestProvince(point: LatLng): string | undefined {
  let best: { name: string; km: number } | undefined;
  for (const [name, c] of Object.entries(PROVINCE_CENTERS)) {
    const km = haversineKm([point.lat, point.lng], [c.lat, c.lng]);
    if (!best || km < best.km) best = { name, km };
  }
  return best?.name;
}

export function geocodeSync(query: string): GeocodeResult | null {
  const province = matchProvince(query);
  if (!province) return null;
  const c = PROVINCE_CENTERS[province]!;
  return {
    point: { lat: c.lat, lng: c.lng },
    formattedAddress: query,
    province,
    provider: "leaflet",
    approximate: true,
  };
}

export function routeSync(req: RouteRequest): RouteResult {
  const distanceKm = haversineKm([req.from.lat, req.from.lng], [req.to.lat, req.to.lng]);
  return {
    distanceKm,
    durationMin: Math.max(1, Math.round((distanceKm / AVG_URBAN_SPEED_KMH) * 60)),
    provider: "leaflet",
    approximate: true,
  };
}

export const localMapsClient: MapsClient = {
  geocode: (query) => Promise.resolve(geocodeSync(query)),
  reverseGeocode: (point) => {
    const province = nearestProvince(point);
    if (!province) return Promise.resolve(null);
    const c = PROVINCE_CENTERS[province]!;
    return Promise.resolve({
      point: { lat: c.lat, lng: c.lng },
      formattedAddress: province,
      province,
      provider: "leaflet" as const,
      approximate: true,
    });
  },
  route: (req) => Promise.resolve(routeSync(req)),
};
