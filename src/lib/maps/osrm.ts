import { mapsApiBase, routingUrl } from "./config";
import type { LatLng, RouteRequest, RouteResult } from "./types";

/**
 * Rotas por estrada (OSRM) — distância, tempo sem trânsito e traçado.
 * Com backend (`VITE_MAPS_API_BASE`) passa pelo proxy (`MapsController`,
 * com cache); sem backend (demo) vai direto ao OSRM, que tem CORS.
 */

const OSRM_PROFILE: Record<NonNullable<RouteRequest["mode"]>, string> = {
  driving: "driving",
  walking: "foot",
  bicycling: "bike",
};

type ProxyRoute = { distanceKm: number; durationMin: number; polyline?: string };

async function viaProxy(req: RouteRequest): Promise<ProxyRoute> {
  const res = await fetch(`${mapsApiBase}/route`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ from: req.from, to: req.to, mode: req.mode ?? "driving" }),
  });
  if (!res.ok) throw new Error(`maps proxy ${res.status}`);
  return (await res.json()) as ProxyRoute;
}

async function direct(req: RouteRequest): Promise<ProxyRoute> {
  const profile = OSRM_PROFILE[req.mode ?? "driving"];
  const coords = `${req.from.lng},${req.from.lat};${req.to.lng},${req.to.lat}`;
  const res = await fetch(
    `${routingUrl}/route/v1/${profile}/${coords}?overview=full&geometries=polyline`,
  );
  if (!res.ok) throw new Error(`routing ${res.status}`);
  const json = (await res.json()) as {
    code: string;
    routes?: { distance: number; duration: number; geometry: string }[];
  };
  const route = json.routes?.[0];
  if (json.code !== "Ok" || !route) throw new Error(`routing ${json.code}`);
  return {
    distanceKm: Math.round(route.distance / 10) / 100,
    durationMin: Math.round(route.duration / 6) / 10,
    polyline: route.geometry,
  };
}

export async function osrmRoute(req: RouteRequest): Promise<RouteResult> {
  const r = mapsApiBase ? await viaProxy(req) : await direct(req);
  return {
    distanceKm: r.distanceKm,
    durationMin: r.durationMin,
    ...(r.polyline ? { polyline: r.polyline } : {}),
    provider: "osm",
    approximate: false,
  };
}

/** Descodifica uma polilinha codificada (formato Google/OSRM, precisão 5). */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
