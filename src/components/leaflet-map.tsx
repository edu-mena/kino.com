import { useEffect, useRef, useState } from "react";
import type * as LType from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapLocateFooter } from "@/components/map-locate-footer";
import { useTranslation } from "@/i18n";
import { clampToRadius, haversineKm } from "@/lib/geo";
import { getMapsClient } from "@/lib/maps/client";
import { mapTilesAttribution, mapTilesUrl } from "@/lib/maps/config";
import { decodePolyline } from "@/lib/maps/osrm";
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
 * Mapa Leaflet + OpenStreetMap (gratuito, sem chave). Só arranca no cliente
 * (`import("leaflet")` dinâmico dentro do efeito) — a app faz SSR. O pino é
 * um `divIcon` com SVG inline. Exposto como `LocationMap`/`LocationPicker`
 * por `@/components/location-map`.
 */

function pinIcon(L: typeof LType, dim = false) {
  return L.divIcon({
    className: "",
    html: pinSvg(dim),
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -36],
  });
}

export function LeafletLocationMap({
  points,
  height = 260,
  className,
  onSelectPoint,
  enableLocate = false,
  scrollWheelZoom = false,
  initialView,
}: LocationMapProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelectPoint);
  onSelectRef.current = onSelectPoint;
  const tRef = useRef(t);
  tRef.current = t;

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [byRoad, setByRoad] = useState(false);
  const [locateError, setLocateError] = useState(false);

  const key =
    points.map((p) => `${p.id}:${p.lat},${p.lng}`).join("|") +
    (initialView ? `#${initialView.lat},${initialView.lng},${initialView.zoom}` : "");

  useEffect(() => {
    setDistanceKm(null);
    setDurationMin(null);
    setByRoad(false);
    setLocateError(false);

    let map: LType.Map | undefined;
    let cancelled = false;

    void import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current, { scrollWheelZoom, attributionControl: true });
      L.tileLayer(mapTilesUrl, { attribution: mapTilesAttribution, maxZoom: 19 }).addTo(map);

      const latlngs: LType.LatLngExpression[] = [];
      for (const p of points) {
        const marker = L.marker([p.lat, p.lng], { icon: pinIcon(L) })
          .addTo(map)
          .bindPopup(p.label);
        marker.on("click", () => onSelectRef.current?.(p.id));
        latlngs.push([p.lat, p.lng]);
      }

      const first = latlngs[0];
      if (initialView) {
        map.setView([initialView.lat, initialView.lng], initialView.zoom);
      } else if (latlngs.length === 1 && first) {
        map.setView(first, 15);
      } else if (latlngs.length > 1) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [28, 28], maxZoom: 13 });
      } else {
        map.setView(LUANDA, 11);
      }

      const target = points.length === 1 ? points[0] : undefined;
      if (!enableLocate || !target) return;

      L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

      let youMarker: LType.CircleMarker | undefined;
      let line: LType.Polyline | undefined;
      const runLocate = () => {
        void getDevicePosition().then((result) => {
          if (cancelled || !map) return;
          if (!result.ok) {
            setLocateError(true);
            return;
          }
          const me = result.coords;
          youMarker?.remove();
          line?.remove();
          youMarker = L.circleMarker(me, {
            radius: 7,
            weight: 3,
            color: YOU_COLOR,
            fillColor: YOU_COLOR,
            fillOpacity: 1,
          })
            .addTo(map)
            .bindPopup(tRef.current("locationMap.you"));
          // Linha reta (tracejada) de imediato; troca pela rota real por
          // estrada (OSRM) assim que esta chega.
          line = L.polyline([me, [target.lat, target.lng]], {
            color: YOU_COLOR,
            weight: 2,
            dashArray: "6 6",
          }).addTo(map);
          map.fitBounds(L.latLngBounds([me, [target.lat, target.lng]]).pad(0.3));
          setDistanceKm(haversineKm(me, [target.lat, target.lng]));
          setDurationMin(null);
          setByRoad(false);
          setLocateError(false);

          void getMapsClient()
            .route({ from: { lat: me[0], lng: me[1] }, to: { lat: target.lat, lng: target.lng } })
            .then((route) => {
              if (cancelled || !map || !route.polyline) return;
              const path = decodePolyline(route.polyline).map(
                (p) => [p.lat, p.lng] as [number, number],
              );
              line?.remove();
              line = L.polyline(path, { color: YOU_COLOR, weight: 4, opacity: 0.85 }).addTo(map);
              map.fitBounds(line.getBounds().pad(0.15));
              setDistanceKm(route.distanceKm);
              setDurationMin(route.durationMin);
              setByRoad(true);
            })
            .catch(() => {
              // Sem rota (serviço em baixo) — fica a linha reta e a distância aproximada.
            });
        });
      };

      const control = new L.Control({ position: "topright" });
      control.onAdd = () => {
        const btn = L.DomUtil.create("button", "leaflet-bar") as HTMLButtonElement;
        btn.type = "button";
        btn.title = tRef.current("locationMap.locate");
        btn.setAttribute("aria-label", tRef.current("locationMap.locate"));
        Object.assign(btn.style, {
          width: "34px",
          height: "34px",
          display: "grid",
          placeItems: "center",
          background: "#fff",
          cursor: "pointer",
        });
        btn.innerHTML =
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/><circle cx="12" cy="12" r="2.5" fill="#111"/></svg>';
        L.DomEvent.on(btn, "click", (e) => {
          L.DomEvent.stop(e);
          runLocate();
        });
        return btn;
      };
      control.addTo(map);
    });

    return () => {
      cancelled = true;
      map?.remove();
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
        <MapLocateFooter
          target={single}
          distanceKm={distanceKm}
          durationMin={durationMin}
          byRoad={byRoad}
          locateError={locateError}
        />
      )}
    </div>
  );
}

export function LeafletLocationPicker({
  value,
  onChange,
  height = 300,
  className,
  anchor,
  maxRadiusMeters = DEFAULT_PIN_RADIUS_METERS,
  onClamped,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<LType.Marker | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Lidos dentro dos handlers do Leaflet (montados uma só vez) — refs para
  // verem sempre o valor atual.
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;
  const radiusRef = useRef(maxRadiusMeters);
  radiusRef.current = maxRadiusMeters;
  const onClampedRef = useRef(onClamped);
  onClampedRef.current = onClamped;
  const circleRef = useRef<LType.Circle | null>(null);
  const leafletRef = useRef<typeof LType | null>(null);
  const [ready, setReady] = useState(false);

  // Init once.
  useEffect(() => {
    let map: LType.Map | undefined;
    let cancelled = false;

    void import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current).setView([value.lat, value.lng], 15);
      mapRef.current = map;
      L.tileLayer(mapTilesUrl, { attribution: mapTilesAttribution, maxZoom: 19 }).addTo(map);

      const marker = L.marker([value.lat, value.lng], {
        icon: pinIcon(L),
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      leafletRef.current = L;

      // Com âncora (morada escolhida), o pino não sai do raio permitido —
      // um arrasto/clique mais longe é puxado de volta para a borda.
      const place = (ll: LType.LatLng) => {
        let next = { lat: ll.lat, lng: ll.lng };
        const a = anchorRef.current;
        if (a) {
          const r = clampToRadius(a, next, radiusRef.current);
          next = r.point;
          if (r.clamped) onClampedRef.current?.();
        }
        marker.setLatLng([next.lat, next.lng]);
        onChangeRef.current({ lat: Number(next.lat.toFixed(5)), lng: Number(next.lng.toFixed(5)) });
      };

      marker.on("dragend", () => place(marker.getLatLng()));
      map.on("click", (e: LType.LeafletMouseEvent) => place(e.latlng));
      setReady(true);
    });

    return () => {
      cancelled = true;
      markerRef.current = null;
      mapRef.current = null;
      circleRef.current = null;
      map?.remove();
    };
    // Só monta uma vez — as atualizações de `value` vêm do próximo efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recentra quando `value` muda por fora (ex.: "usar centro da província").
  useEffect(() => {
    const marker = markerRef.current;
    const map = mapRef.current;
    if (!marker || !map) return;
    const cur = marker.getLatLng();
    if (Math.abs(cur.lat - value.lat) > 1e-6 || Math.abs(cur.lng - value.lng) > 1e-6) {
      marker.setLatLng([value.lat, value.lng]);
      map.setView([value.lat, value.lng], map.getZoom());
    }
  }, [value.lat, value.lng]);

  // Círculo discreto com a área onde o pino pode ser afinado.
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    circleRef.current?.remove();
    circleRef.current = null;
    if (!map || !L || !anchor) return;
    circleRef.current = L.circle([anchor.lat, anchor.lng], {
      radius: maxRadiusMeters,
      color: "#16a34a",
      weight: 1,
      fillOpacity: 0.06,
      interactive: false,
    }).addTo(map);
  }, [ready, anchor?.lat, anchor?.lng, maxRadiusMeters]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, width: "100%", ...MAP_CONTAINER_STYLE }}
    />
  );
}
