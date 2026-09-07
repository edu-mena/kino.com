import { useEffect, useRef, useState } from "react";
import type * as LType from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "@/i18n";
import { formatKm, haversineKm } from "@/lib/geo";

/**
 * Mapa Leaflet + OpenStreetMap. Só arranca no cliente (`import("leaflet")`
 * dinâmico dentro do efeito) — a app faz SSR. Sem dependência dos PNGs de
 * marcador do Leaflet: o pino é um `divIcon` com SVG inline na cor primária.
 *
 * `LocationMap` — visualização (1..N pontos). Com `enableLocate` ganha barra
 * de escala e um botão "a minha localização" que traça a linha até ao ponto
 * e mostra a distância + rota. `LocationPicker` — edição de um ponto
 * (arrastar/clicar), controlado à `WeeklyHoursEditor`.
 */

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const LUANDA: [number, number] = [-8.839, 13.2894];
const YOU_COLOR = "#2563eb";

function pinIcon(L: typeof LType, dim = false) {
  return L.divIcon({
    className: "",
    html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))${
      dim ? ";opacity:.55" : ""
    }"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="var(--color-primary,#e11d48)"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -36],
  });
}

export type MapPoint = { id: string; lat: number; lng: number; label: string };

export function LocationMap({
  points,
  height = 260,
  className,
  onSelectPoint,
  enableLocate = false,
  scrollWheelZoom = false,
  initialView,
}: {
  points: MapPoint[];
  height?: number;
  className?: string;
  onSelectPoint?: (id: string) => void;
  /** Barra de escala + botão "a minha localização" (só faz sentido com 1 ponto). */
  enableLocate?: boolean;
  scrollWheelZoom?: boolean;
  /** Vista inicial fixa (centro + zoom). Se omitido, ajusta aos pontos. */
  initialView?: { lat: number; lng: number; zoom: number };
}) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelectPoint);
  onSelectRef.current = onSelectPoint;
  const tRef = useRef(t);
  tRef.current = t;

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [mePos, setMePos] = useState<[number, number] | null>(null);
  const [locateError, setLocateError] = useState(false);

  const key =
    points.map((p) => `${p.id}:${p.lat},${p.lng}`).join("|") +
    (initialView ? `#${initialView.lat},${initialView.lng},${initialView.zoom}` : "");

  useEffect(() => {
    setDistanceKm(null);
    setMePos(null);
    setLocateError(false);

    let map: LType.Map | undefined;
    let cancelled = false;

    void import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current, { scrollWheelZoom, attributionControl: true });
      L.tileLayer(OSM_URL, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);

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
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          setLocateError(true);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled || !map) return;
            const me: [number, number] = [pos.coords.latitude, pos.coords.longitude];
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
            line = L.polyline([me, [target.lat, target.lng]], {
              color: YOU_COLOR,
              weight: 2,
              dashArray: "6 6",
            }).addTo(map);
            map.fitBounds(L.latLngBounds([me, [target.lat, target.lng]]).pad(0.3));
            setMePos(me);
            setDistanceKm(haversineKm(me, [target.lat, target.lng]));
            setLocateError(false);
          },
          () => setLocateError(true),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
        );
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
  const directionsUrl =
    mePos && single
      ? `https://www.openstreetmap.org/directions?route=${mePos[0]}%2C${mePos[1]}%3B${single.lat}%2C${single.lng}`
      : null;
  const distanceLabel = distanceKm == null ? null : formatKm(distanceKm);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        style={{ height, width: "100%", borderRadius: "var(--radius-2xl)", overflow: "hidden" }}
        aria-label={t("locationMap.aria")}
        role="img"
      />
      {enableLocate && (distanceLabel != null || locateError) && (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {distanceLabel != null && (
            <span className="font-semibold text-foreground">
              {t("locationMap.distanceAway", { km: distanceLabel })}
            </span>
          )}
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              {t("locationMap.directions")}
            </a>
          )}
          {locateError && <span className="text-destructive">{t("locationMap.locateError")}</span>}
        </p>
      )}
    </div>
  );
}

export function LocationPicker({
  value,
  onChange,
  height = 300,
  className,
}: {
  value: { lat: number; lng: number };
  onChange: (next: { lat: number; lng: number }) => void;
  height?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<LType.Marker | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Init once.
  useEffect(() => {
    let map: LType.Map | undefined;
    let cancelled = false;

    void import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current).setView([value.lat, value.lng], 15);
      mapRef.current = map;
      L.tileLayer(OSM_URL, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);

      const marker = L.marker([value.lat, value.lng], {
        icon: pinIcon(L),
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      const emit = (ll: LType.LatLng) =>
        onChangeRef.current({ lat: Number(ll.lat.toFixed(5)), lng: Number(ll.lng.toFixed(5)) });

      marker.on("dragend", () => emit(marker.getLatLng()));
      map.on("click", (e: LType.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        emit(e.latlng);
      });
    });

    return () => {
      cancelled = true;
      markerRef.current = null;
      mapRef.current = null;
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

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, width: "100%", borderRadius: "var(--radius-2xl)", overflow: "hidden" }}
    />
  );
}
