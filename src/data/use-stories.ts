import { useEffect, useState } from "react";
import { getEffectiveStories } from "./stories-store";
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
    const sync = () => setStories(getEffectiveStories());
    sync();
    window.addEventListener("kino:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("kino:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return stories;
}
