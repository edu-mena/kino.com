import { INITIAL_STORIES } from "./mockData";
import { safeLocalStorageSet } from "./safe-storage";
import type { RestaurantStory } from "./types";

/**
 * CRUD de stories do painel do restaurante (`/admin/stories`) — mesmo
 * desenho de `@/data/menu-store`: funções puras e síncronas, seguras em
 * SSR (`typeof window`), guardando só a diferença face ao seed (criados +
 * eliminados; stories não têm edição, só existem/deixam de existir).
 *
 * **Todos** os stories duram só 1 dia. 24h depois de `createdAt` deixam de
 * aparecer (`getEffectiveStories` filtra-os) e são apagados do localStorage
 * no próximo `pruneExpiredStories()` — os criados no painel saem de
 * `customStories`, os do seed vão para `deletedIds` (não voltam). Os stories
 * do seed (`INITIAL_STORIES`) são re-ancorados à 1ª abertura da app
 * (`kino_stories_seed_epoch`), por isso o carrossel de demonstração aparece
 * durante 24h e depois esvazia, tal como os reais.
 */

const STORIES_KEY = "kino_stories_admin";
const SEED_EPOCH_KEY = "kino_stories_seed_epoch";
const CHANGE_EVENT = "kino:menu-changed";
const HOUR_MS = 60 * 60 * 1000;

/** Tempo de vida de qualquer story. */
export const STORY_TTL_MS = 24 * HOUR_MS;
/** Duração máxima de um vídeo de story, em segundos. */
export const STORY_VIDEO_MAX_SEC = 20;
/** Janela em que os stories-semente ficam "recentes" após a 1ª abertura. */
const SEED_SPREAD_MS = 22 * HOUR_MS;

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

/** Momento (persistido) da 1ª execução — âncora dos stories-semente. */
function seedEpoch(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const stored = window.localStorage.getItem(SEED_EPOCH_KEY);
    if (stored && Number.isFinite(Number(stored))) return Number(stored);
    const now = Date.now();
    window.localStorage.setItem(SEED_EPOCH_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

/**
 * Stories-semente com `createdAt` re-ancorado à 1ª abertura da app, mantendo
 * a ordem original (o mais recente fica em `epoch`, o mais antigo a ~22h).
 */
function seededStories(): RestaurantStory[] {
  const epoch = seedEpoch();
  const ordered = [...INITIAL_STORIES].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  const span = Math.max(1, ordered.length - 1);
  return ordered.map((s, rank) => ({
    ...s,
    createdAt: new Date(epoch - ((span - rank) / span) * SEED_SPREAD_MS).toISOString(),
  }));
}

/**
 * Todos os stories visíveis: seed + criados, sempre − eliminados e − os que
 * já passaram das 24h.
 */
export function getEffectiveStories(): RestaurantStory[] {
  const { customStories, deletedIds } = readState();
  const fromSeed = seededStories().filter((s) => !deletedIds.includes(s.id) && isFresh(s));
  return [...fromSeed, ...customStories.filter(isFresh)];
}

/** Apaga do localStorage os stories que já passaram das 24h (criados e seed). */
export function pruneExpiredStories() {
  const state = readState();
  const keptCustom = state.customStories.filter(isFresh);
  const expiredSeedIds = seededStories()
    .filter((s) => !isFresh(s) && !state.deletedIds.includes(s.id))
    .map((s) => s.id);
  if (keptCustom.length !== state.customStories.length || expiredSeedIds.length > 0) {
    writeState({
      customStories: keptCustom,
      deletedIds: [...state.deletedIds, ...expiredSeedIds],
    });
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
