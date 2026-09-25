import { useMemo } from "react";
import { useProfileViewsSummary } from "@/lib/profile-views";
import type { ProfileViewer } from "./profile-views-store";

/** Visitantes únicos do perfil de um restaurante, reativo a novas visitas —
 * nos dois modos (servidor com backend real, localStorage na demo; ver
 * @/lib/profile-views). Mantém o formato antigo para a secção do perfil. */
export function useProfileViewers(restaurantId: string): ProfileViewer[] {
  const { summary } = useProfileViewsSummary(restaurantId || undefined);

  return useMemo(
    () =>
      summary.viewers.map((v) => ({
        restaurantId,
        viewerKey: v.id,
        ...(v.name ? { viewerName: v.name } : {}),
        firstAt: v.firstAt,
        lastAt: v.lastAt,
        visits: v.visits,
      })),
    [summary.viewers, restaurantId],
  );
}
