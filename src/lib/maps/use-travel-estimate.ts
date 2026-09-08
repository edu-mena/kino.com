import { useEffect, useMemo, useState } from "react";
import { getMapsClient, usesRealRouting } from "./client";
import { routeSync } from "./local-client";
import type { LatLng, RouteResult, TravelMode } from "./types";

type Status = "disabled" | "approximate" | "loading" | "ready" | "error";

export type TravelEstimate = {
  /**
   * Sempre presente quando há `from` e `to`: começa como aproximação local
   * (haversine) e é substituído pela rota real quando o backend responde.
   * Verifica `result.approximate` para saber qual está a ver.
   */
  result: RouteResult | null;
  status: Status;
  error?: Error;
};

/**
 * Estimativa de deslocação entre dois pontos, atrás do contrato de `MapsClient`.
 *
 * Hoje devolve a aproximação local de forma síncrona (sem "loading", SSR-safe).
 * Quando `VITE_MAPS_PROVIDER=google` + `VITE_MAPS_API_BASE` estiverem
 * definidos, o mesmo hook passa a devolver distância/tempo reais (com
 * trânsito) — os ecrãs não mudam.
 */
export function useTravelEstimate(
  from: LatLng | null | undefined,
  to: LatLng | null | undefined,
  opts: { enabled?: boolean; mode?: TravelMode; departAt?: Date } = {},
): TravelEstimate {
  const { enabled = true, mode = "driving", departAt } = opts;
  const active = Boolean(enabled && from && to);

  // Valor imediato — aproximação local. Nunca "pisca".
  const local = useMemo<RouteResult | null>(
    () =>
      active && from && to
        ? routeSync({ from, to, mode, ...(departAt ? { departAt } : {}) })
        : null,
    // departAt entra pela chave estável do efeito abaixo, não aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, from?.lat, from?.lng, to?.lat, to?.lng, mode],
  );

  const [real, setReal] = useState<RouteResult | null>(null);
  const [error, setError] = useState<Error | undefined>();

  // Minuto de partida — estabiliza `new Date()` passado a cada render.
  const departKey = departAt ? Math.floor(departAt.getTime() / 60_000) : 0;

  useEffect(() => {
    setReal(null);
    setError(undefined);
    if (!active || !from || !to || !usesRealRouting()) return;

    let cancelled = false;
    getMapsClient()
      .route({ from, to, mode, ...(departAt ? { departAt } : {}) })
      .then((r) => {
        if (!cancelled) setReal(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, from?.lat, from?.lng, to?.lat, to?.lng, mode, departKey]);

  if (!active) return { result: null, status: "disabled" };
  if (real) return { result: real, status: "ready" };
  if (error) return { result: local, status: "error", error };
  if (usesRealRouting()) return { result: local, status: "loading" };
  return { result: local, status: "approximate" };
}
