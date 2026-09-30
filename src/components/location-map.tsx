import { GoogleLocationMap, GoogleLocationPicker } from "@/components/google-map";
import { LeafletLocationMap, LeafletLocationPicker } from "@/components/leaflet-map";
import { isGoogleMapsEnabled } from "@/lib/maps/config";

export type { MapPoint } from "@/lib/maps/map-ui";

/**
 * Ponto de entrada dos mapas da app. Com `VITE_MAPS_PROVIDER=google` +
 * `VITE_GOOGLE_MAPS_API_KEY` → Google Maps (e autocomplete de moradas, ver
 * `AddressAutocomplete`); sem isso → Leaflet + OpenStreetMap (demo/dev).
 *
 * `LocationMap` — visualização (1..N pontos); com `enableLocate` ganha o
 * botão "a minha localização", a distância e "Como chegar".
 * `LocationPicker` — edição de um ponto (arrastar/clicar); com `anchor`, o
 * pino só pode ser afinado dentro de um raio da morada escolhida.
 */
export const LocationMap = isGoogleMapsEnabled ? GoogleLocationMap : LeafletLocationMap;
export const LocationPicker = isGoogleMapsEnabled ? GoogleLocationPicker : LeafletLocationPicker;
