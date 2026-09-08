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
