import { INITIAL_STORIES } from "./mockData";
import type { RestaurantStory } from "./types";

/**
 * CRUD de stories do painel do restaurante (`/admin/stories`) — mesmo
 * desenho de `@/data/menu-store`: funções puras e síncronas, seguras em
 * SSR (`typeof window`), guardando só a diferença face ao seed (criados +
 * eliminados; stories não têm edição, só existem/deixam de existir).
 */

const STORIES_KEY = "kino_stories_admin";
const CHANGE_EVENT = "kino:menu-changed";

type StoriesState = {
  customStories: RestaurantStory[];
  deletedIds: string[];
};

const EMPTY_STATE: StoriesState = { customStories: [], deletedIds: [] };

function readState(): StoriesState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const stored = window.localStorage.getItem(STORIES_KEY);
    return stored ? { ...EMPTY_STATE, ...JSON.parse(stored) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function writeState(state: StoriesState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORIES_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Todos os stories (de todos os restaurantes): seed − eliminados + criados. */
export function getEffectiveStories(): RestaurantStory[] {
  const { customStories, deletedIds } = readState();
  const fromSeed = INITIAL_STORIES.filter((s) => !deletedIds.includes(s.id));
  return [...fromSeed, ...customStories];
}

export function createStory(restaurantId: string, image: string): RestaurantStory {
  const state = readState();
  const story: RestaurantStory = {
    id: `story-custom-${Date.now()}`,
    restaurantId,
    image,
    createdAt: new Date().toISOString(),
  };
  writeState({ ...state, customStories: [...state.customStories, story] });
  return story;
}

export function deleteStory(id: string) {
  const state = readState();
  if (state.customStories.some((s) => s.id === id)) {
    writeState({ ...state, customStories: state.customStories.filter((s) => s.id !== id) });
    return;
  }
  writeState({ ...state, deletedIds: [...state.deletedIds, id] });
}
