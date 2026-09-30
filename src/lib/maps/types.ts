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
  /** Momento previsto de partida (reservado para fornecedores com trânsito). */
  departAt?: Date;
};

export type RouteResult = {
  distanceKm: number;
  /** Duração de condução sem trânsito. */
  durationMin: number;
  /** Duração com trânsito previsto — só com fornecedores que a dão (o OSRM não dá). */
  durationInTrafficMin?: number;
  /** Polilinha codificada (precisão 5) para desenhar a rota — ver `decodePolyline`. */
  polyline?: string;
  provider: MapsProvider;
  /** `true` = haversine + velocidade média (sem ruas/trânsito). `false` = rota real. */
  approximate: boolean;
};

/**
 * Contrato que os consumidores usam (`getMapsClient()`): Photon/OSRM, com
 * recuo para o cálculo local. Trocar de fornecedor não mexe nos ecrãs.
 */
export interface MapsClient {
  geocode(query: string): Promise<GeocodeResult | null>;
  reverseGeocode(point: LatLng): Promise<GeocodeResult | null>;
  route(req: RouteRequest): Promise<RouteResult>;
}
