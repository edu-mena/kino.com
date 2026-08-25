import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createStory, deleteStory, getEffectiveStories } from "@/data/stories-store";
import { INITIAL_STORIES } from "@/data/mockData";
import type { RestaurantStory } from "@/data/types";

type StoriesAdminValue = {
  stories: RestaurantStory[];
  storiesByRestaurant: (restaurantId: string) => RestaurantStory[];
  createStory: (restaurantId: string, image: string) => { story: RestaurantStory; ok: boolean };
  deleteStory: (id: string) => void;
};

const StoriesAdminContext = createContext<StoriesAdminValue | null>(null);

export function StoriesAdminProvider({ children }: { children: ReactNode }) {
  // SSR-safe: primeira renderização usa sempre o seed estático puro, sem
  // tocar em localStorage — evita mismatch de hidratação.
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

  const value: StoriesAdminValue = {
    stories,
    storiesByRestaurant: (restaurantId) => stories.filter((s) => s.restaurantId === restaurantId),
    createStory: (restaurantId, image) => createStory(restaurantId, image),
    deleteStory: (id) => deleteStory(id),
  };

  return <StoriesAdminContext.Provider value={value}>{children}</StoriesAdminContext.Provider>;
}

export function useStoriesAdmin() {
  const ctx = useContext(StoriesAdminContext);
  if (!ctx) throw new Error("useStoriesAdmin must be used inside StoriesAdminProvider");
  return ctx;
}
