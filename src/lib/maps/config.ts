/**
 * Configuração dos mapas — 100% gratuita, sem chaves (OpenStreetMap):
 *
 * - Mapa: Leaflet + tiles OSM.
 * - Moradas (autocomplete, geocoding, reverse): Photon (komoot), feito
 *   para pesquisa enquanto se escreve, com dados OSM de Angola.
 * - Rotas: OSRM (distância/tempo por estrada + traçado; sem trânsito).
 *
 * Os serviços públicos gratuitos pedem uso moderado. Cada URL é
 * configurável para, quando o volume crescer, apontar para instâncias
 * próprias (Photon/OSRM correm em Docker, sem custo de licença) sem mexer
 * no código. Variáveis (ver `.env.example`):
 *
 *   VITE_GEOCODER_URL   — Photon. Omissão: https://photon.komoot.io
 *   VITE_ROUTING_URL    — OSRM.   Omissão: https://router.project-osrm.org
 *   VITE_MAP_TILES_URL  — tiles.  Omissão: tiles do OpenStreetMap
 *   VITE_MAPS_API_BASE  — proxy do nosso backend (<api>/maps): rotas passam
 *                         por lá (cache + identificação do cliente), em vez
 *                         de irem direto ao OSRM público.
 */

export type MapsProvider = "local" | "osm";

const env = (name: string) =>
  ((import.meta.env[name] as string | undefined)?.trim() || "").replace(/\/$/, "");

export const geocoderUrl = env("VITE_GEOCODER_URL") || "https://photon.komoot.io";

export const routingUrl = env("VITE_ROUTING_URL") || "https://router.project-osrm.org";

export const mapTilesUrl =
  (import.meta.env["VITE_MAP_TILES_URL"] as string | undefined)?.trim() ||
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export const mapTilesAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Base do backend-proxy de mapas (sem barra final). */
export const mapsApiBase = env("VITE_MAPS_API_BASE");

export const isMapsBackendConfigured = mapsApiBase.length > 0;

/**
 * Angola (com Cabinda) — [minLon, minLat, maxLon, maxLat]. Restringe as
 * sugestões de morada ao país.
 */
export const ANGOLA_BBOX = [11.6, -18.1, 24.1, -4.3] as const;
