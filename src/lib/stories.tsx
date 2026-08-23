import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getStoriesForRestaurant } from "@/data/helpers";

const STORAGE_KEY = "kino_viewed_stories";

type StoriesValue = {
  viewedStoryIds: string[];
  isStoryViewed: (storyId: string) => boolean;
  markStoryViewed: (storyId: string) => void;
  /** Só "visto" quando TODOS os stories do restaurante já foram vistos — igual WhatsApp. */
  isRestaurantFullyViewed: (restaurantId: string) => boolean;
};

const StoriesContext = createContext<StoriesValue | null>(null);

export function StoriesProvider({ children }: { children: ReactNode }) {
  const [viewedStoryIds, setViewedStoryIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setViewedStoryIds(JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const markStoryViewed = (storyId: string) => {
    setViewedStoryIds((prev) => {
      if (prev.includes(storyId)) return prev;
      const next = [...prev, storyId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value: StoriesValue = {
    viewedStoryIds,
    isStoryViewed: (storyId) => viewedStoryIds.includes(storyId),
    markStoryViewed,
    isRestaurantFullyViewed: (restaurantId) => {
      const stories = getStoriesForRestaurant(restaurantId);
      return stories.length > 0 && stories.every((s) => viewedStoryIds.includes(s.id));
    },
  };

  return <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>;
}

export function useStories() {
  const ctx = useContext(StoriesContext);
  if (!ctx) throw new Error("useStories must be used inside StoriesProvider");
  return ctx;
}
