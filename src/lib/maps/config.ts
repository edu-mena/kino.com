/**
 * Configuração do fornecedor de mapas — mesmo padrão de `@/lib/image-cdn`:
 * ativa-se por variável de ambiente e, sem ela, o comportamento é o atual
 * (Leaflet + OpenStreetMap + distância em linha reta). Nada de tráfego para
 * a Google sem uma escolha explícita.
 *
 * Variáveis (ver `.env.example`):
 *
 *   VITE_MAPS_PROVIDER=google
 *     Liga o caminho Google. Sem isto → "leaflet" (atual).
 *
 *   VITE_GOOGLE_MAPS_API_KEY=...
 *     Chave *de browser* da Google Maps Platform, restrita por referrer.
 *     Usada só para RENDERIZAR o mapa (Maps JavaScript API / tiles).
 *
 *   VITE_MAPS_API_BASE=https://api.kino.com/maps
 *     Base do nosso backend-proxy que fala com Geocoding / Routes /
 *     Distance Matrix. A chave *de servidor* vive lá, nunca no cliente.
 *     Enquanto não existir, o cliente Google lança erro claro e o app
 *     recai no cálculo local — ver `google-client.ts`.
 */

export type MapsProvider = "leaflet" | "google";

const rawProvider = (import.meta.env["VITE_MAPS_PROVIDER"] as string | undefined)?.toLowerCase();

export const mapsProvider: MapsProvider = rawProvider === "google" ? "google" : "leaflet";

/** Chave de browser para renderizar o mapa Google (restrita por referrer). */
export const googleMapsBrowserKey =
  (import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] as string | undefined)?.trim() || "";

/** Base do backend-proxy de geocoding/rotas (sem barra final). */
export const mapsApiBase = (
  (import.meta.env["VITE_MAPS_API_BASE"] as string | undefined)?.trim() || ""
).replace(/\/$/, "");

/** O mapa deve ser desenhado com a Google (precisa de provider + chave de browser). */
export const isGoogleMapsEnabled = mapsProvider === "google" && googleMapsBrowserKey.length > 0;

/** Há backend para geocoding/rotas reais. Enquanto `false`, usa-se o cálculo local. */
export const isMapsBackendConfigured = mapsApiBase.length > 0;

/** Geocoding/rotas reais disponíveis: provider Google + backend-proxy montado. */
export const isRealRoutingAvailable = mapsProvider === "google" && isMapsBackendConfigured;
