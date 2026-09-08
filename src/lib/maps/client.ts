import { isRealRoutingAvailable } from "./config";
import { googleMapsClient } from "./google-client";
import { localMapsClient } from "./local-client";
import type { MapsClient } from "./types";

/**
 * Cliente de geocoding/rotas ativo. Google só quando o provider está em
 * `google` E o backend-proxy está configurado; caso contrário, o cálculo
 * local (haversine) — que cobre 100% dos ecrãs hoje.
 */
export function getMapsClient(): MapsClient {
  return isRealRoutingAvailable ? googleMapsClient : localMapsClient;
}

/** `true` quando `getMapsClient()` devolve rotas reais (ruas + trânsito). */
export function usesRealRouting(): boolean {
  return isRealRoutingAvailable;
}
