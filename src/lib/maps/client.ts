import { isGoogleMapsEnabled, isRealRoutingAvailable } from "./config";
import { googleMapsClient } from "./google-client";
import { googleJsGeocode, googleJsReverseGeocode } from "./google-js";
import { localMapsClient } from "./local-client";
import type { MapsClient } from "./types";

/**
 * Cliente de geocoding/rotas ativo, peça a peça:
 * - geocode/reverse: Google no browser (chave de browser) quando o mapa
 *   Google está ligado; senão o backend-proxy, se existir; senão local.
 * - route: backend-proxy (chave de servidor + cache) quando existe; senão
 *   haversine local.
 * Geocoding que falhe recai no cálculo local — nunca rebenta um ecrã por
 * causa do fornecedor de mapas.
 */
const geocoder: Pick<MapsClient, "geocode" | "reverseGeocode"> = isGoogleMapsEnabled
  ? { geocode: googleJsGeocode, reverseGeocode: googleJsReverseGeocode }
  : isRealRoutingAvailable
    ? googleMapsClient
    : localMapsClient;

const router: Pick<MapsClient, "route"> = isRealRoutingAvailable
  ? googleMapsClient
  : localMapsClient;

const activeClient: MapsClient = {
  geocode: (q) => geocoder.geocode(q).catch(() => localMapsClient.geocode(q)),
  reverseGeocode: (p) => geocoder.reverseGeocode(p).catch(() => localMapsClient.reverseGeocode(p)),
  // Sem fallback aqui: `useTravelEstimate` já trata o erro (estado "error"
  // com o valor local), e esconder a falha mudaria esse estado.
  route: (req) => router.route(req),
};

export function getMapsClient(): MapsClient {
  return activeClient;
}

/** `true` quando `getMapsClient()` devolve rotas reais (ruas + trânsito). */
export function usesRealRouting(): boolean {
  return isRealRoutingAvailable;
}
