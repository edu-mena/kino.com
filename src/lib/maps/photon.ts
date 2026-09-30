import { PROVINCE_CENTERS } from "@/data/restaurant-coordinates";
import { haversineKm } from "@/lib/geo";
import { ANGOLA_BBOX, geocoderUrl } from "./config";
import type { GeocodeResult, LatLng } from "./types";

/**
 * Photon (https://github.com/komoot/photon) — geocoder OSM gratuito, sem
 * chave, pensado para autocomplete. Chamado diretamente do browser (tem
 * CORS). Uso moderado: debounce no campo, mínimo de 3 letras e cache em
 * memória por pesquisa.
 */

export const PIN_RADIUS_EXACT_METERS = 150;
const PIN_RADIUS_MAX_METERS = 2000;

type PhotonProperties = {
  osm_type?: string;
  osm_id?: number;
  type?: string;
  name?: string;
  street?: string;
  housenumber?: string;
  locality?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  countrycode?: string;
  /** [minLon, maxLat, maxLon, minLat] */
  extent?: [number, number, number, number];
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: PhotonProperties;
};

export type AddressSuggestion = {
  id: string;
  /** Linha principal ("Rua Rainha Ginga", "Edifício X"). */
  primary: string;
  /** Contexto ("Mutamba, Luanda"). */
  secondary: string;
  result: GeocodeResult;
  /**
   * Quanto o pino pode ser afinado a partir deste ponto: 150 m para um
   * local exato (edifício, loja); para uma rua/bairro, metade da diagonal
   * da sua extensão (uma rua comprida não tem um só ponto certo), até 2 km.
   * `null` = resultado vago demais (cidade/província) para marcar um local.
   */
  radiusMeters: number | null;
};

const stripAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

/**
 * "Província de Luanda" / "Luanda Province" → "Luanda". Devolve o nome
 * canónico da nossa lista (`PROVINCE_CENTERS`) quando bate, ignorando acentos;
 * senão o nome limpo (ex.: províncias novas da reforma de 2024).
 */
export function canonicalProvince(raw: string | undefined | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const clean = raw
    .trim()
    .replace(/^prov[íi]ncia\s+(de|do|da)\s+/i, "")
    .replace(/\s+province$/i, "")
    .trim();
  const key = stripAccents(clean).toLowerCase();
  return (
    Object.keys(PROVINCE_CENTERS).find((name) => stripAccents(name).toLowerCase() === key) ?? clean
  );
}

const VAGUE_TYPES = new Set(["city", "county", "state", "country"]);

/**
 * Sem `extent` o Photon só dá um ponto — para áreas (bairro, localidade,
 * rua) usa-se um raio típico do tipo, senão um bairro inteiro ficava preso
 * a 150 m do seu centro.
 */
const RADIUS_WITHOUT_EXTENT: Record<string, number> = {
  district: PIN_RADIUS_MAX_METERS,
  locality: 1000,
  street: 300,
};

function radiusFor(p: PhotonProperties): number | null {
  if (p.type && VAGUE_TYPES.has(p.type)) return null;
  if (p.type === "house") return PIN_RADIUS_EXACT_METERS;
  if (!p.extent) return RADIUS_WITHOUT_EXTENT[p.type ?? ""] ?? PIN_RADIUS_EXACT_METERS;
  const [minLon, maxLat, maxLon, minLat] = p.extent;
  const halfDiagonal = (haversineKm([minLat, minLon], [maxLat, maxLon]) * 1000) / 2;
  return Math.round(
    Math.min(PIN_RADIUS_MAX_METERS, Math.max(PIN_RADIUS_EXACT_METERS, halfDiagonal)),
  );
}

const unique = (parts: (string | undefined)[]) =>
  parts.filter((x, i, all): x is string => !!x && all.indexOf(x) === i);

/**
 * Converte um resultado Photon — exportado para testes. `preferStreet`
 * (reverse geocoding): o ponto mais próximo é muitas vezes um negócio
 * vizinho ("Kitanda da Esquina") — para uma morada, a rua é o que interessa.
 */
export function toSuggestion(f: PhotonFeature, preferStreet = false): AddressSuggestion | null {
  const p = f.properties;
  if (p.countrycode && p.countrycode.toUpperCase() !== "AO") return null;
  const [lng, lat] = f.geometry.coordinates;
  const streetLine = p.street ? unique([p.street, p.housenumber]).join(" ") : undefined;
  const primary = preferStreet
    ? (streetLine ?? p.name ?? p.locality ?? p.district ?? p.city)
    : (p.name ?? streetLine ?? p.locality ?? p.district ?? p.city);
  if (!primary) return null;
  const secondary = unique([
    streetLine !== primary ? streetLine : undefined,
    p.locality,
    p.district,
    p.city,
    p.state,
  ])
    .filter((x) => x !== primary)
    .join(", ");
  const province = canonicalProvince(p.state);
  return {
    id: `${p.osm_type ?? "X"}${p.osm_id ?? `${lat},${lng}`}`,
    primary,
    secondary,
    result: {
      point: { lat, lng },
      formattedAddress: secondary ? `${primary}, ${secondary}` : primary,
      ...(province ? { province } : {}),
      provider: "osm",
      approximate: false,
    },
    radiusMeters: radiusFor(p),
  };
}

const cache = new Map<string, AddressSuggestion[]>();

async function photon(
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal,
  preferStreet = false,
) {
  const res = await fetch(`${geocoderUrl}${path}?${new URLSearchParams(params)}`, {
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`geocoder ${res.status}`);
  const json = (await res.json()) as { features?: PhotonFeature[] };
  return (json.features ?? [])
    .map((f) => toSuggestion(f, preferStreet))
    .filter((s): s is AddressSuggestion => !!s);
}

/** Sugestões de morada em Angola, com viés para `near` quando dado. */
export async function fetchAddressSuggestions(
  query: string,
  near?: LatLng,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  const key = `${q.toLowerCase()}|${near ? `${near.lat.toFixed(2)},${near.lng.toFixed(2)}` : ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const list = await photon(
    "/api/",
    {
      q,
      limit: "6",
      bbox: ANGOLA_BBOX.join(","),
      ...(near ? { lat: String(near.lat), lon: String(near.lng) } : {}),
    },
    signal,
  );
  if (cache.size > 100) cache.clear();
  cache.set(key, list);
  return list;
}

export async function photonGeocode(query: string): Promise<GeocodeResult | null> {
  const [first] = await fetchAddressSuggestions(query);
  return first?.result ?? null;
}

export async function photonReverseGeocode(point: LatLng): Promise<GeocodeResult | null> {
  const [first] = await photon(
    "/reverse",
    { lat: String(point.lat), lon: String(point.lng), limit: "1" },
    undefined,
    true,
  );
  return first?.result ?? null;
}
