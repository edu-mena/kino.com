import type { MapsProvider } from "./config";

/** Ponto geográfico. Alinhado com `{ lat, lng }` usado em `Restaurant`/`SavedAddress`. */
export type LatLng = { lat: number; lng: number };

export type TravelMode = "driving" | "walking" | "bicycling";

export type GeocodeResult = {
  point: LatLng;
  /** Morada normalizada devolvida pelo fornecedor (ou a query, no modo local). */
  formattedAddress: string;
  /** Componente de nível "província"/"admin area", quando identificável. */
  province?: string;
  provider: MapsProvider;
  /** `true` quando é uma aproximação local (centro de província), não um geocode real. */
  approximate: boolean;
};

export type RouteRequest = {
  from: LatLng;
  to: LatLng;
  mode?: TravelMode;
  /** Momento previsto de partida — usado para trânsito previsto (só Google). */
  departAt?: Date;
};

export type RouteResult = {
  distanceKm: number;
  /** Duração de condução sem trânsito. */
  durationMin: number;
  /** Duração com trânsito previsto — presente só quando o fornecedor a dá (Google). */
  durationInTrafficMin?: number;
  /** Polilinha codificada (formato Google) para desenhar a rota, quando disponível. */
  polyline?: string;
  provider: MapsProvider;
  /** `true` = haversine + velocidade média (sem ruas/trânsito). `false` = rota real. */
  approximate: boolean;
};

/**
 * Contrato que os consumidores usam. Hoje resolve-se com `LocalMapsClient`
 * (haversine); quando o backend Google estiver montado, `getMapsClient()`
 * devolve `GoogleMapsClient` sem mais alterações nos ecrãs.
 */
export interface MapsClient {
  geocode(query: string): Promise<GeocodeResult | null>;
  reverseGeocode(point: LatLng): Promise<GeocodeResult | null>;
  route(req: RouteRequest): Promise<RouteResult>;
}
