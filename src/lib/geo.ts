/** Distância em linha reta (km) entre dois pontos `[lat, lng]` — haversine. */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "1.2 km" abaixo de 10 km, "34 km" acima — para etiquetas curtas. */
export function formatKm(km: number): string {
  return km < 10 ? km.toFixed(1) : String(Math.round(km));
}

/**
 * Ajuste fino do pino: mantém `point` a no máximo `maxMeters` de `anchor`
 * (a posição que a morada escolhida devolveu). Fora do raio, puxa-o de volta
 * para a borda, na mesma direção. Interpolação linear em lat/lng — exata o
 * suficiente para raios de centenas de metros.
 */
export function clampToRadius(
  anchor: { lat: number; lng: number },
  point: { lat: number; lng: number },
  maxMeters: number,
): { point: { lat: number; lng: number }; clamped: boolean } {
  const meters = haversineKm([anchor.lat, anchor.lng], [point.lat, point.lng]) * 1000;
  if (meters <= maxMeters) return { point, clamped: false };
  const t = maxMeters / meters;
  return {
    point: {
      lat: Number((anchor.lat + (point.lat - anchor.lat) * t).toFixed(6)),
      lng: Number((anchor.lng + (point.lng - anchor.lng) * t).toFixed(6)),
    },
    clamped: true,
  };
}

/** Link universal "Como chegar" do Google Maps — abre a app Google Maps no telemóvel. */
export function googleDirectionsUrl(to: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}`;
}
