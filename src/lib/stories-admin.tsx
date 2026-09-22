import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createApiStory, deleteApiStory, fetchApiStories } from "@/data/api-stories";
import {
  createStory,
  deleteStory,
  getEffectiveStories,
  pruneExpiredStories,
} from "@/data/stories-store";
import { INITIAL_STORIES } from "@/data/mockData";
import type { RestaurantStory } from "@/data/types";
import { hasRealBackend } from "@/lib/api-client";
import { getAdminToken, useRestaurantAdmin } from "@/lib/restaurant-admin";

type StoryOpts = {
  mediaType?: "image" | "video";
  durationSec?: number;
  text?: string;
  link?: string;
};

type StoriesAdminValue = {
  stories: RestaurantStory[];
  storiesByRestaurant: (restaurantId: string) => RestaurantStory[];
  /** `ok: false` = a escrita falhou (validação/rede) — a story pode não ter
   * sido guardada. Antes eram síncronas/só-mock; com backend real, criar/
   * apagar precisa de esperar a API confirmar antes de o admin ver "sucesso". */
  createStory: (
    restaurantId: string,
    src: string,
    opts?: StoryOpts,
  ) => Promise<{ story: RestaurantStory | null; ok: boolean }>;
  deleteStory: (id: string) => Promise<boolean>;
};

const StoriesAdminContext = createContext<StoriesAdminValue | null>(null);

export function StoriesAdminProvider({ children }: { children: ReactNode }) {
  const { managedRestaurantId } = useRestaurantAdmin();
  const [apiStories, setApiStories] = useState<RestaurantStory[]>([]);
  // SSR-safe: primeira renderização usa sempre o seed estático puro, sem
  // tocar em localStorage — evita mismatch de hidratação.
  const [mockStories, setMockStories] = useState<RestaurantStory[]>(
    hasRealBackend ? [] : INITIAL_STORIES,
  );

  const refetchApi = () => {
    if (!managedRestaurantId) {
      setApiStories([]);
      return;
    }
    fetchApiStories(managedRestaurantId)
      .then(setApiStories)
      .catch(() => setApiStories([]));
  };

  useEffect(() => {
    if (hasRealBackend) {
      refetchApi();
      return;
    }
    const sync = () => {
      pruneExpiredStories();
      setMockStories(getEffectiveStories());
    };
    sync();
    // Volta a limpar stories expirados a cada minuto enquanto o painel
    // estiver aberto — as 24h passam sem navegação nenhuma.
    const timer = window.setInterval(sync, 60_000);
    window.addEventListener("luku:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("luku:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedRestaurantId]);

  const stories = hasRealBackend ? apiStories : mockStories;

  const value: StoriesAdminValue = hasRealBackend
    ? {
        stories,
        storiesByRestaurant: (restaurantId) =>
          stories.filter((s) => s.restaurantId === restaurantId),
        createStory: async (restaurantId, src, opts) => {
          const token = getAdminToken();
          if (!token) return { story: null, ok: false };
          try {
            const story = await createApiStory(restaurantId, { image: src, ...opts }, token);
            refetchApi();
            return { story, ok: true };
          } catch {
            return { story: null, ok: false };
          }
        },
        deleteStory: async (id) => {
          const token = getAdminToken();
          if (!token) return false;
          try {
            await deleteApiStory(id, token);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
      }
    : {
        stories,
        storiesByRestaurant: (restaurantId) =>
          stories.filter((s) => s.restaurantId === restaurantId),
        createStory: (restaurantId, src, opts) =>
          Promise.resolve(createStory(restaurantId, src, opts)),
        deleteStory: (id) => {
          deleteStory(id);
          return Promise.resolve(true);
        },
      };

  return <StoriesAdminContext.Provider value={value}>{children}</StoriesAdminContext.Provider>;
}

export function useStoriesAdmin() {
  const ctx = useContext(StoriesAdminContext);
  if (!ctx) throw new Error("useStoriesAdmin must be used inside StoriesAdminProvider");
  return ctx;
}
