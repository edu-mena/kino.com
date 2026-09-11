import { useEffect, useState } from "react";
import { getEffectiveStories, pruneExpiredStories } from "./stories-store";
import { INITIAL_STORIES } from "./mockData";
import type { RestaurantStory } from "./types";

/**
 * Todos os stories, reativo a criações/eliminações feitas no painel do
 * restaurante (`/admin/stories`) — mesmo padrão SSR-safe de
 * `@/data/use-menu-items`: primeira renderização usa sempre o seed
 * estático (evita mismatch de hidratação), sincroniza com o estado real
 * logo a seguir, só no cliente.
 */
export function useEffectiveStories(): RestaurantStory[] {
  const [stories, setStories] = useState<RestaurantStory[]>(INITIAL_STORIES);

  useEffect(() => {
    const sync = () => {
      pruneExpiredStories();
      setStories(getEffectiveStories());
    };
    sync();
    // As 24h de um story passam sem navegação nenhuma — revê a cada minuto.
    const timer = window.setInterval(sync, 60_000);
    window.addEventListener("luku:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("luku:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return stories;
}
