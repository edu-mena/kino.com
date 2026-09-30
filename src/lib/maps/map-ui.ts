/**
 * Peças partilhadas pelos mapas (Leaflet/OSM) — ver `@/components/location-map`.
 */

export type MapPoint = { id: string; lat: number; lng: number; label: string };

export type LocationMapProps = {
  points: MapPoint[];
  height?: number;
  className?: string;
  onSelectPoint?: (id: string) => void;
  /** Botão "a minha localização" + distância + "Como chegar" (só faz sentido com 1 ponto). */
  enableLocate?: boolean;
  scrollWheelZoom?: boolean;
  /** Vista inicial fixa (centro + zoom). Se omitido, ajusta aos pontos. */
  initialView?: { lat: number; lng: number; zoom: number };
};

export type LocationPickerProps = {
  value: { lat: number; lng: number };
  onChange: (next: { lat: number; lng: number }) => void;
  height?: number;
  className?: string;
  /**
   * Posição devolvida pela morada escolhida (autocomplete). Quando existe, o
   * pino só pode ser afinado até `maxRadiusMeters` dela — não dá para o pôr
   * num sítio que nada tem a ver com a morada escrita.
   */
  anchor?: { lat: number; lng: number } | null | undefined;
  maxRadiusMeters?: number | undefined;
  /** Chamado quando um arrasto/clique fora do raio foi puxado de volta. */
  onClamped?: () => void;
};

export const DEFAULT_PIN_RADIUS_METERS = 150;

export const LUANDA: [number, number] = [-8.839, 13.2894];
export const YOU_COLOR = "#2563eb";

/**
 * Os mapas põem z-index altos nos seus painéis/controlos (Leaflet 400–1000).
 * Sem um stacking context próprio, esses valores competem com o resto da
 * página e o mapa aparece por cima de dropdowns (Select/Popover), do header
 * e da tabbar. `isolation: isolate` + `zIndex: 0` confinam-nos ao contentor.
 */
export const MAP_CONTAINER_STYLE = {
  borderRadius: "var(--radius-2xl)",
  overflow: "hidden",
  position: "relative",
  zIndex: 0,
  isolation: "isolate",
} as const;

export function pinSvg(dim = false): string {
  return `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))${
    dim ? ";opacity:.55" : ""
  }"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="var(--color-primary,#e11d48)"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`;
}
