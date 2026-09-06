import { INITIAL_STORIES } from "./mockData";
import { safeLocalStorageSet } from "./safe-storage";
import type { RestaurantStory } from "./types";

/**
 * CRUD de stories do painel do restaurante (`/admin/stories`) — mesmo
 * desenho de `@/data/menu-store`: funções puras e síncronas, seguras em
 * SSR (`typeof window`), guardando só a diferença face ao seed (criados +
 * eliminados; stories não têm edição, só existem/deixam de existir).
 *
 * Stories criados no painel auto-expiram: 24h depois de `createdAt` deixam
 * de aparecer (`getEffectiveStories` filtra-os) e são removidos do
 * localStorage no próximo `pruneExpiredStories()`. Os stories do seed
 * (`INITIAL_STORIES`) são conteúdo de demonstração e ficam sempre visíveis.
 */

const STORIES_KEY = "kino_stories_admin";
const CHANGE_EVENT = "kino:menu-changed";

/** Tempo de vida de um story criado no painel. */
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;
/** Duração máxima de um vídeo de story, em segundos. */
export const STORY_VIDEO_MAX_SEC = 20;

type StoriesState = {
  customStories: RestaurantStory[];
  deletedIds: string[];
};

const EMPTY_STATE: StoriesState = { customStories: [], deletedIds: [] };

const isFresh = (s: RestaurantStory) => Date.now() - Date.parse(s.createdAt) < STORY_TTL_MS;

function readState(): StoriesState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const stored = window.localStorage.getItem(STORIES_KEY);
    return stored ? { ...EMPTY_STATE, ...JSON.parse(stored) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function writeState(state: StoriesState): boolean {
  if (typeof window === "undefined") return true;
  const ok = safeLocalStorageSet(STORIES_KEY, JSON.stringify(state));
  if (ok) window.dispatchEvent(new Event(CHANGE_EVENT));
  return ok;
}

/**
 * Todos os stories visíveis: seed − eliminados + criados ainda dentro das
 * 24h. Os do seed não expiram (conteúdo de demonstração).
 */
export function getEffectiveStories(): RestaurantStory[] {
  const { customStories, deletedIds } = readState();
  const fromSeed = INITIAL_STORIES.filter((s) => !deletedIds.includes(s.id));
  return [...fromSeed, ...customStories.filter(isFresh)];
}

/** Apaga do localStorage os stories criados que já passaram das 24h. */
export function pruneExpiredStories() {
  const state = readState();
  const kept = state.customStories.filter(isFresh);
  if (kept.length !== state.customStories.length) {
    writeState({ ...state, customStories: kept });
  }
}

export function createStory(
  restaurantId: string,
  src: string,
  opts: { mediaType?: "image" | "video"; durationSec?: number } = {},
): { story: RestaurantStory; ok: boolean } {
  const state = readState();
  const story: RestaurantStory = {
    id: `story-custom-${Date.now()}`,
    restaurantId,
    image: src,
    createdAt: new Date().toISOString(),
    ...(opts.mediaType === "video"
      ? {
          mediaType: "video" as const,
          ...(opts.durationSec ? { durationSec: opts.durationSec } : {}),
        }
      : {}),
  };
  const ok = writeState({ ...state, customStories: [...state.customStories, story] });
  return { story, ok };
}

export function deleteStory(id: string) {
  const state = readState();
  if (state.customStories.some((s) => s.id === id)) {
    writeState({ ...state, customStories: state.customStories.filter((s) => s.id !== id) });
    return;
  }
  writeState({ ...state, deletedIds: [...state.deletedIds, id] });
}
