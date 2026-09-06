import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createStory,
  deleteStory,
  getEffectiveStories,
  pruneExpiredStories,
} from "@/data/stories-store";
import { INITIAL_STORIES } from "@/data/mockData";
import type { RestaurantStory } from "@/data/types";

type StoriesAdminValue = {
  stories: RestaurantStory[];
  storiesByRestaurant: (restaurantId: string) => RestaurantStory[];
  createStory: (
    restaurantId: string,
    src: string,
    opts?: { mediaType?: "image" | "video"; durationSec?: number },
  ) => { story: RestaurantStory; ok: boolean };
  deleteStory: (id: string) => void;
};

const StoriesAdminContext = createContext<StoriesAdminValue | null>(null);

export function StoriesAdminProvider({ children }: { children: ReactNode }) {
  // SSR-safe: primeira renderização usa sempre o seed estático puro, sem
  // tocar em localStorage — evita mismatch de hidratação.
  const [stories, setStories] = useState<RestaurantStory[]>(INITIAL_STORIES);

  useEffect(() => {
    const sync = () => {
      pruneExpiredStories();
      setStories(getEffectiveStories());
    };
    sync();
    // Volta a limpar stories expirados a cada minuto enquanto o painel
    // estiver aberto — as 24h passam sem navegação nenhuma.
    const timer = window.setInterval(sync, 60_000);
    window.addEventListener("kino:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("kino:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const value: StoriesAdminValue = {
    stories,
    storiesByRestaurant: (restaurantId) => stories.filter((s) => s.restaurantId === restaurantId),
    createStory: (restaurantId, src, opts) => createStory(restaurantId, src, opts),
    deleteStory: (id) => deleteStory(id),
  };

  return <StoriesAdminContext.Provider value={value}>{children}</StoriesAdminContext.Provider>;
}

export function useStoriesAdmin() {
  const ctx = useContext(StoriesAdminContext);
  if (!ctx) throw new Error("useStoriesAdmin must be used inside StoriesAdminProvider");
  return ctx;
}
