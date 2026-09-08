import { isMapsBackendConfigured, mapsApiBase } from "./config";
import type { GeocodeResult, MapsClient, RouteRequest, RouteResult } from "./types";

/**
 * Cliente que fala com o NOSSO backend-proxy (`VITE_MAPS_API_BASE`), não
 * diretamente com a Google — a chave de servidor e o cache vivem lá.
 *
 * Enquanto `VITE_MAPS_API_BASE` não estiver definido, cada método lança
 * `MapsBackendNotConfiguredError`; `getMapsClient()` nunca chega a
 * devolver este cliente nesse estado, mas o guard evita surpresas se for
 * usado à mão.
 *
 * ─── Contrato esperado do backend (a implementar mais tarde) ─────────────
 *
 *   GET  {base}/geocode?q=<texto>
 *        → 200 { point:{lat,lng}, formattedAddress, province? }
 *        → 204 (sem resultado)
 *
 *   GET  {base}/reverse-geocode?lat=<n>&lng=<n>
 *        → 200 { point:{lat,lng}, formattedAddress, province? }
 *        → 204
 *
 *   POST {base}/route   body: { from:{lat,lng}, to:{lat,lng}, mode?, departAt? }
 *        → 200 { distanceKm, durationMin, durationInTrafficMin?, polyline? }
 *
 * O backend deve: injetar a chave Google, cachear por (origem,destino,~hora)
 * com TTL curto, e aplicar rate-limiting por utilizador/IP.
 */

export class MapsBackendNotConfiguredError extends Error {
  constructor() {
    super("VITE_MAPS_API_BASE não está definido — backend de mapas indisponível.");
    this.name = "MapsBackendNotConfiguredError";
  }
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!isMapsBackendConfigured) throw new MapsBackendNotConfiguredError();
  const res = await fetch(`${mapsApiBase}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`maps backend ${res.status} em ${path}`);
  return (await res.json()) as T;
}

export const googleMapsClient: MapsClient = {
  async geocode(query) {
    const raw = await getJson<Omit<GeocodeResult, "provider" | "approximate">>(
      `/geocode?q=${encodeURIComponent(query)}`,
    );
    return raw ? { ...raw, provider: "google", approximate: false } : null;
  },

  async reverseGeocode(point) {
    const raw = await getJson<Omit<GeocodeResult, "provider" | "approximate">>(
      `/reverse-geocode?lat=${point.lat}&lng=${point.lng}`,
    );
    return raw ? { ...raw, provider: "google", approximate: false } : null;
  },

  async route(req: RouteRequest) {
    const raw = await getJson<Omit<RouteResult, "provider" | "approximate">>("/route", {
      method: "POST",
      body: JSON.stringify({
        from: req.from,
        to: req.to,
        mode: req.mode ?? "driving",
        departAt: req.departAt?.toISOString(),
      }),
    });
    if (!raw) throw new Error("rota sem resultado");
    return { ...raw, provider: "google", approximate: false };
  },
};
