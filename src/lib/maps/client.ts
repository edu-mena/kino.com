import { localMapsClient } from "./local-client";
import { osrmRoute } from "./osrm";
import { photonGeocode, photonReverseGeocode } from "./photon";
import type { MapsClient } from "./types";

/**
 * Cliente de mapas ativo — gratuito (OSM): moradas pelo Photon, rotas pelo
 * OSRM (via proxy do backend quando existe). Geocoding que falhe recai no
 * cálculo local (centro de província) — nunca rebenta um ecrã. Rotas não
 * recaem aqui: `useTravelEstimate` já trata o erro (estado "error" com o
 * valor local).
 */
const activeClient: MapsClient = {
  geocode: (q) => photonGeocode(q).catch(() => localMapsClient.geocode(q)),
  reverseGeocode: (p) => photonReverseGeocode(p).catch(() => localMapsClient.reverseGeocode(p)),
  route: (req) => osrmRoute(req),
};

export function getMapsClient(): MapsClient {
  return activeClient;
}

/** Rotas reais por estrada (OSRM) — sempre disponíveis (serviço gratuito). */
export function usesRealRouting(): boolean {
  return true;
}
