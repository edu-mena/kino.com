import { PROVINCE_CENTERS } from "@/data/restaurant-coordinates";
import { loadGoogleLibrary } from "./google-loader";
import type { GeocodeResult, LatLng } from "./types";

/**
 * Serviços Google que correm NO BROWSER com a chave de browser (restrita por
 * referrer): autocomplete de moradas (Places API New) e geocoding/reverse
 * (Geocoder da Maps JS). Rotas/ETA continuam no backend-proxy (cache +
 * chave de servidor) — ver `google-client.ts`.
 */

const stripAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

/**
 * "Província de Luanda" / "Luanda Province" → "Luanda". Devolve o nome
 * canónico da nossa lista (`PROVINCE_CENTERS`) quando bate, ignorando acentos;
 * senão o nome limpo tal como veio (ex.: províncias novas da reforma de 2024).
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

function provinceFromComponents(
  components: { types: string[]; longText?: string | null; long_name?: string }[] | undefined,
): string | undefined {
  const c = components?.find((x) => x.types.includes("administrative_area_level_1"));
  return canonicalProvince(c?.longText ?? c?.long_name);
}

export type AddressSuggestion = {
  id: string;
  /** Linha principal ("Rua Rainha Ginga 29"). */
  primary: string;
  /** Contexto ("Luanda, Angola"). */
  secondary: string;
  prediction: google.maps.places.PlacePrediction;
};

export async function newAutocompleteSession(): Promise<google.maps.places.AutocompleteSessionToken> {
  const { AutocompleteSessionToken } = await loadGoogleLibrary("places");
  return new AutocompleteSessionToken();
}

/** Sugestões de morada restritas a Angola, com viés para `near` quando dado. */
export async function fetchAddressSuggestions(
  input: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
  near?: LatLng,
): Promise<AddressSuggestion[]> {
  const { AutocompleteSuggestion } = await loadGoogleLibrary("places");
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    sessionToken,
    includedRegionCodes: ["ao"],
    language: "pt",
    region: "ao",
    ...(near ? { locationBias: { center: near, radius: 30_000 } } : {}),
  });
  return suggestions.flatMap((s) => {
    const p = s.placePrediction;
    if (!p) return [];
    return [
      {
        id: p.placeId,
        primary: p.mainText?.text ?? p.text.text,
        secondary: p.secondaryText?.text ?? "",
        prediction: p,
      },
    ];
  });
}

/** Detalhes da sugestão escolhida — fecha a sessão de autocomplete (1 cobrança). */
export async function resolveSuggestion(s: AddressSuggestion): Promise<GeocodeResult | null> {
  const place = s.prediction.toPlace();
  await place.fetchFields({ fields: ["location", "formattedAddress", "addressComponents"] });
  if (!place.location) return null;
  const province = provinceFromComponents(place.addressComponents ?? undefined);
  return {
    point: { lat: place.location.lat(), lng: place.location.lng() },
    formattedAddress: place.formattedAddress ?? s.primary,
    ...(province ? { province } : {}),
    provider: "google",
    approximate: false,
  };
}

async function geocodeRequest(req: google.maps.GeocoderRequest): Promise<GeocodeResult | null> {
  const { Geocoder } = await loadGoogleLibrary("geocoding");
  try {
    const { results } = await new Geocoder().geocode({ ...req, region: "ao", language: "pt" });
    const first = results[0];
    if (!first) return null;
    const province = provinceFromComponents(first.address_components);
    return {
      point: { lat: first.geometry.location.lat(), lng: first.geometry.location.lng() },
      formattedAddress: first.formatted_address,
      ...(province ? { province } : {}),
      provider: "google",
      approximate: false,
    };
  } catch {
    // ZERO_RESULTS também chega como exceção na Maps JS.
    return null;
  }
}

export const googleJsGeocode = (query: string) =>
  geocodeRequest({ address: query, componentRestrictions: { country: "AO" } });

export const googleJsReverseGeocode = (point: LatLng) => geocodeRequest({ location: point });
