import { useEffect, useState } from "react";
import { fetchApiStories } from "./api-stories";
import { hasRealBackend } from "@/lib/api-client";
import { getEffectiveStories, pruneExpiredStories } from "./stories-store";
import { INITIAL_STORIES } from "./mockData";
import type { Restaurant, RestaurantStory } from "./types";

/**
 * Todos os stories (feed global: institucionais + todos os restaurantes),
 * reativo a criações/eliminações feitas no painel do restaurante
 * (`/admin/stories`) — mesmo padrão SSR-safe de `@/data/use-menu-items`:
 * primeira renderização usa sempre o seed estático (evita mismatch de
 * hidratação), sincroniza com o estado real logo a seguir, só no cliente.
 *
 * Com backend real, busca `GET /stories` (ver @/data/api-stories) em vez do
 * `getEffectiveStories()` local — antes disto, o carrossel de stories na
 * home nunca via o que um restaurante real publicava (só existia no
 * localStorage de quem criou, no painel).
 */
export function useEffectiveStories(): RestaurantStory[] {
  const [stories, setStories] = useState<RestaurantStory[]>(hasRealBackend ? [] : INITIAL_STORIES);

  useEffect(() => {
    if (hasRealBackend) {
      const sync = () => {
        fetchApiStories()
          .then(setStories)
          .catch(() => setStories([]));
      };
      sync();
      // Sem evento de mudança cross-cliente vindo do backend — revê a cada
      // minuto (stories já têm TTL real de 24h no servidor) para apanhar
      // criações/expirações feitas por outra sessão.
      const timer = window.setInterval(sync, 60_000);
      return () => window.clearInterval(timer);
    }
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

/** Stories de um restaurante, do mais antigo pro mais recente (ordem de
 * exibição) — mesma lógica de `@/data/helpers`' `getStoriesForRestaurant`,
 * mas operando sobre um array já carregado (mock OU API real via
 * `useEffectiveStories`), para os componentes de cliente (`story-viewer`,
 * `@/lib/stories`) não dependerem de uma leitura síncrona só-local. */
export function storiesForRestaurant(
  stories: RestaurantStory[],
  restaurantId: string,
): RestaurantStory[] {
  return stories
    .filter((s) => s.restaurantId === restaurantId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/** Restaurantes (dentro da lista dada) que têm pelo menos um story, mais
 * recente primeiro — mesma lógica de `getRestaurantsWithStories`, mas a
 * partir de um array de stories já carregado e da lista de restaurantes já
 * disponível no componente chamador (evita nova leitura/fetch aqui). */
export function restaurantsWithStories(
  stories: RestaurantStory[],
  restaurants: Restaurant[],
): Restaurant[] {
  const idsByLatestStory = new Map<string, number>();
  for (const story of stories) {
    const time = new Date(story.createdAt).getTime();
    const current = idsByLatestStory.get(story.restaurantId);
    if (current === undefined || time > current) {
      idsByLatestStory.set(story.restaurantId, time);
    }
  }
  const byId = new Map(restaurants.map((r) => [r.id, r]));
  return [...idsByLatestStory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id))
    .filter((r): r is Restaurant => !!r);
}
