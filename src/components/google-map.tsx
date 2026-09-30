import { useEffect, useRef, useState } from "react";
import { LeafletLocationMap, LeafletLocationPicker } from "@/components/leaflet-map";
import { MapLocateFooter } from "@/components/map-locate-footer";
import { useTranslation } from "@/i18n";
import { clampToRadius, haversineKm } from "@/lib/geo";
import { googleMapsMapId } from "@/lib/maps/config";
import { loadGoogleLibrary } from "@/lib/maps/google-loader";
import {
  DEFAULT_PIN_RADIUS_METERS,
  LUANDA,
  MAP_CONTAINER_STYLE,
  pinSvg,
  YOU_COLOR,
  type LocationMapProps,
  type LocationPickerProps,
} from "@/lib/maps/map-ui";
import { getDevicePosition } from "@/lib/native-permissions";

/**
 * Renderizador Google Maps (Maps JavaScript API) — mesma API que a variante
 * Leaflet (`leaflet-map.tsx`); `@/components/location-map` escolhe qual.
 * Obrigatório quando se usam resultados do Places/Geocoding da Google: os
 * termos não permitem mostrá-los sobre um mapa de outro fornecedor.
 */

function pinElement(): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = pinSvg();
  return el;
}

const BASE_MAP_OPTIONS: google.maps.MapOptions = {
  mapId: googleMapsMapId,
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
};

export function GoogleLocationMap(props: LocationMapProps) {
  // A API da Google não carregou (chave inválida/restrita, sem rede) → o
  // mapa OSM de sempre, em vez de um retângulo vazio.
  const [failed, setFailed] = useState(false);
  if (failed) return <LeafletLocationMap {...props} />;
  return <GoogleLocationMapInner {...props} onLoadError={() => setFailed(true)} />;
}

function GoogleLocationMapInner({
  points,
  height = 260,
  className,
  onSelectPoint,
  enableLocate = false,
  scrollWheelZoom = false,
  initialView,
  onLoadError,
}: LocationMapProps & { onLoadError: () => void }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelectPoint);
  onSelectRef.current = onSelectPoint;
  const tRef = useRef(t);
  tRef.current = t;

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [locateError, setLocateError] = useState(false);

  const key =
    points.map((p) => `${p.id}:${p.lat},${p.lng}`).join("|") +
    (initialView ? `#${initialView.lat},${initialView.lng},${initialView.zoom}` : "");

  useEffect(() => {
    setDistanceKm(null);
    setLocateError(false);
    let cancelled = false;
    const cleanups: (() => void)[] = [];

    void Promise.all([loadGoogleLibrary("maps"), loadGoogleLibrary("marker")])
      .then(([{ Map, InfoWindow, Polyline }, { AdvancedMarkerElement }]) => {
        if (cancelled || !containerRef.current) return;
        const map = new Map(containerRef.current, {
          ...BASE_MAP_OPTIONS,
          gestureHandling: scrollWheelZoom ? "greedy" : "cooperative",
        });
        const info = new InfoWindow();
        const bounds = new google.maps.LatLngBounds();

        for (const p of points) {
          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: p.lat, lng: p.lng },
            content: pinElement(),
            title: p.label,
          });
          marker.addListener("click", () => {
            info.setContent(p.label);
            info.open({ map, anchor: marker });
            onSelectRef.current?.(p.id);
          });
          bounds.extend({ lat: p.lat, lng: p.lng });
        }

        if (initialView) {
          map.setCenter({ lat: initialView.lat, lng: initialView.lng });
          map.setZoom(initialView.zoom);
        } else if (points.length === 1 && points[0]) {
          map.setCenter({ lat: points[0].lat, lng: points[0].lng });
          map.setZoom(15);
        } else if (points.length > 1) {
          map.fitBounds(bounds, 28);
        } else {
          map.setCenter({ lat: LUANDA[0], lng: LUANDA[1] });
          map.setZoom(11);
        }

        const target = points.length === 1 ? points[0] : undefined;
        if (!enableLocate || !target) return;

        let you: google.maps.marker.AdvancedMarkerElement | null = null;
        let line: google.maps.Polyline | null = null;
        const runLocate = () => {
          void getDevicePosition().then((result) => {
            if (cancelled) return;
            if (!result.ok) {
              setLocateError(true);
              return;
            }
            const [lat, lng] = result.coords;
            const dot = document.createElement("div");
            Object.assign(dot.style, {
              width: "14px",
              height: "14px",
              borderRadius: "9999px",
              background: YOU_COLOR,
              border: "3px solid #fff",
              boxShadow: "0 1px 4px rgba(0,0,0,.35)",
            });
            if (you) you.map = null;
            line?.setMap(null);
            you = new AdvancedMarkerElement({
              map,
              position: { lat, lng },
              content: dot,
              title: tRef.current("locationMap.you"),
            });
            line = new Polyline({
              map,
              path: [
                { lat, lng },
                { lat: target.lat, lng: target.lng },
              ],
              strokeColor: YOU_COLOR,
              strokeOpacity: 0,
              icons: [
                {
                  icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 2 },
                  offset: "0",
                  repeat: "10px",
                },
              ],
            });
            const b = new google.maps.LatLngBounds();
            b.extend({ lat, lng });
            b.extend({ lat: target.lat, lng: target.lng });
            map.fitBounds(b, 40);
            setDistanceKm(haversineKm([lat, lng], [target.lat, target.lng]));
            setLocateError(false);
          });
        };

        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = tRef.current("locationMap.locate");
        btn.setAttribute("aria-label", tRef.current("locationMap.locate"));
        Object.assign(btn.style, {
          width: "40px",
          height: "40px",
          margin: "10px",
          display: "grid",
          placeItems: "center",
          background: "#fff",
          border: "none",
          borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,.3)",
          cursor: "pointer",
        });
        btn.innerHTML =
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/><circle cx="12" cy="12" r="2.5" fill="#111"/></svg>';
        btn.addEventListener("click", runLocate);
        map.controls[google.maps.ControlPosition.RIGHT_TOP]?.push(btn);
        cleanups.push(() => btn.removeEventListener("click", runLocate));
      })
      .catch(() => {
        if (!cancelled) onLoadError();
      });

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const single = points.length === 1 ? points[0] : undefined;
  return (
    <div className={className}>
      <div
        ref={containerRef}
        style={{ height, width: "100%", ...MAP_CONTAINER_STYLE }}
        aria-label={t("locationMap.aria")}
        role="img"
      />
      {enableLocate && single && (
        <MapLocateFooter target={single} distanceKm={distanceKm} locateError={locateError} />
      )}
    </div>
  );
}

export function GoogleLocationPicker(props: LocationPickerProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <LeafletLocationPicker {...props} />;
  return <GoogleLocationPickerInner {...props} onLoadError={() => setFailed(true)} />;
}

function GoogleLocationPickerInner({
  value,
  onChange,
  height = 300,
  className,
  anchor,
  maxRadiusMeters = DEFAULT_PIN_RADIUS_METERS,
  onClamped,
  onLoadError,
}: LocationPickerProps & { onLoadError: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const radiusRef = useRef(maxRadiusMeters);
  radiusRef.current = maxRadiusMeters;
  const onClampedRef = useRef(onClamped);
  onClampedRef.current = onClamped;
  const [ready, setReady] = useState(false);

  // Monta uma vez — mudanças de `value`/`anchor` vêm dos efeitos seguintes.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadGoogleLibrary("maps"), loadGoogleLibrary("marker")])
      .then(([{ Map }, { AdvancedMarkerElement }]) => {
        if (cancelled || !containerRef.current) return;
        const map = new Map(containerRef.current, {
          ...BASE_MAP_OPTIONS,
          center: value,
          zoom: 16,
          gestureHandling: "greedy",
        });
        const marker = new AdvancedMarkerElement({
          map,
          position: value,
          content: pinElement(),
          gmpDraggable: true,
        });

        const place = (lat: number, lng: number) => {
          let next = { lat, lng };
          const a = anchorRef.current;
          if (a) {
            const r = clampToRadius(a, next, radiusRef.current);
            next = r.point;
            if (r.clamped) onClampedRef.current?.();
          }
          marker.position = next;
          onChangeRef.current({
            lat: Number(next.lat.toFixed(5)),
            lng: Number(next.lng.toFixed(5)),
          });
        };

        marker.addListener("dragend", () => {
          const pos = marker.position;
          if (!pos) return;
          const ll = pos instanceof google.maps.LatLng ? pos.toJSON() : pos;
          place(Number(ll.lat), Number(ll.lng));
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) place(e.latLng.lat(), e.latLng.lng());
        });

        mapRef.current = map;
        markerRef.current = marker;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) onLoadError();
      });
    return () => {
      cancelled = true;
      if (markerRef.current) markerRef.current.map = null;
      circleRef.current?.setMap(null);
      markerRef.current = null;
      circleRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recentra quando `value` muda por fora (ex.: morada escolhida no autocomplete).
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const pos = marker.position;
    const cur = pos instanceof google.maps.LatLng ? pos.toJSON() : pos;
    if (
      !cur ||
      Math.abs(Number(cur.lat) - value.lat) > 1e-6 ||
      Math.abs(Number(cur.lng) - value.lng) > 1e-6
    ) {
      marker.position = value;
      map.panTo(value);
    }
  }, [ready, value.lat, value.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Área onde o pino pode ser afinado (só com âncora).
  useEffect(() => {
    const map = mapRef.current;
    circleRef.current?.setMap(null);
    circleRef.current = null;
    if (!map || !anchor) return;
    circleRef.current = new google.maps.Circle({
      map,
      center: anchor,
      radius: maxRadiusMeters,
      strokeColor: "#16a34a",
      strokeWeight: 1,
      fillColor: "#16a34a",
      fillOpacity: 0.06,
      clickable: false,
    });
    map.setZoom(Math.max(map.getZoom() ?? 16, 17));
  }, [ready, anchor?.lat, anchor?.lng, maxRadiusMeters]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, width: "100%", ...MAP_CONTAINER_STYLE }}
    />
  );
}
