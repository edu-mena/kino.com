import { useEffect, useState } from "react";
import { getProfileViewers, type ProfileViewer } from "./profile-views-store";

/** Visitantes únicos do perfil de um restaurante, reativo a novas visitas
 * — mesmo padrão SSR-safe de `@/data/use-offers`. */
export function useProfileViewers(restaurantId: string): ProfileViewer[] {
  const [viewers, setViewers] = useState<ProfileViewer[]>([]);

  useEffect(() => {
    const sync = () => setViewers(getProfileViewers(restaurantId));
    sync();
    window.addEventListener("kino:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("kino:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [restaurantId]);

  return viewers;
}
