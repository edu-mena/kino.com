import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchApiFollows,
  followApiRestaurant,
  setApiFollowNotify,
  unfollowApiRestaurant,
  type ApiFollowState,
} from "@/data/api-follows";
import { safeLocalStorageSet } from "@/data/safe-storage";
import { STORAGE_KEYS } from "@/data/storage-keys";
import { hasRealBackend } from "@/lib/api-client";
import { getAuthToken, useAuth } from "@/lib/auth";
import { viewerKey } from "@/lib/customer";

/**
 * Seguir restaurantes — substitui os antigos favoritos de restaurante
 * (favoritos ficam só para pratos/bebidas). Quem segue recebe avisos de
 * stories, promoções e preços; o sino (`notify`) desliga os avisos de um
 * restaurante sem deixar de o seguir.
 *
 * Seguir exige conta (é para receber notificações) — `toggleFollow`
 * devolve `"login"` para o convidado, e quem chama leva-o a entrar.
 *
 * Com backend real, a lista vem de `GET /follows`; sem ele (demo), fica em
 * localStorage, uma linha por (conta, restaurante) — o que também dá uma
 * contagem de seguidores coerente entre as contas de demo do browser.
 */
export type FollowEntry = { restaurantId: string; notify: boolean; at: string };

type StoredFollow = FollowEntry & { ownerKey: string };

type FollowsValue = {
  /** Restaurantes seguidos por quem está a ver, mais recente primeiro. */
  follows: FollowEntry[];
  isFollowing: (restaurantId: string) => boolean;
  isNotifying: (restaurantId: string) => boolean;
  /** `"login"` = convidado, não fez nada; `"ok"` = alternou. */
  toggleFollow: (restaurantId: string) => "ok" | "login";
  setNotify: (restaurantId: string, notify: boolean) => void;
  /** Nº de seguidores: o último valor conhecido do servidor (resposta de
   * seguir/deixar de seguir) vence o `initial` que veio no restaurante. */
  followersCount: (restaurantId: string, initial?: number) => number | undefined;
};

const FollowsContext = createContext<FollowsValue | null>(null);

/** Favoritos de restaurante antigos (em `luku_preferences`) — lidos uma vez
 * para passar a seguir, depois removidos de lá. */
const LEGACY_PREFS_KEY = "luku_preferences";

function readStored(): StoredFollow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.follows);
    return raw ? (JSON.parse(raw) as StoredFollow[]) : [];
  } catch {
    return [];
  }
}

function writeStored(list: StoredFollow[]) {
  safeLocalStorageSet(STORAGE_KEYS.follows, JSON.stringify(list));
}

function takeLegacyFavoriteRestaurants(): string[] {
  try {
    const raw = window.localStorage.getItem(LEGACY_PREFS_KEY);
    if (!raw) return [];
    const prefs = JSON.parse(raw) as { favoriteRestaurantIds?: string[] };
    const ids = prefs.favoriteRestaurantIds ?? [];
    if (ids.length === 0 && !("favoriteRestaurantIds" in prefs)) return [];
    delete prefs.favoriteRestaurantIds;
    safeLocalStorageSet(LEGACY_PREFS_KEY, JSON.stringify(prefs));
    return ids;
  } catch {
    return [];
  }
}

export function FollowsProvider({ children }: { children: ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const ownerKey = viewerKey(user);
  const [stored, setStored] = useState<StoredFollow[]>([]);
  const [apiFollows, setApiFollows] = useState<FollowEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Demo: carrega do localStorage e acompanha as outras abas.
  useEffect(() => {
    if (hasRealBackend) return;
    setStored(readStored());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.follows) setStored(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Backend real: lista do servidor sempre que a sessão muda.
  useEffect(() => {
    if (!hasRealBackend) return;
    const token = getAuthToken();
    if (!isLoggedIn || !token) {
      setApiFollows([]);
      return;
    }
    let cancelled = false;
    fetchApiFollows(token)
      .then((list) => {
        if (cancelled) return;
        setApiFollows(
          list.map((f) => ({
            restaurantId: f.restaurantId,
            notify: f.notify,
            at: f.followedAt ?? new Date().toISOString(),
          })),
        );
      })
      .catch(() => {
        // best-effort — o botão continua a funcionar, só começa vazio.
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id]);

  // Favoritos de restaurante antigos passam a "seguir" no primeiro login.
  useEffect(() => {
    if (!isLoggedIn) return;
    const legacy = takeLegacyFavoriteRestaurants();
    if (legacy.length === 0) return;
    if (hasRealBackend) {
      const token = getAuthToken();
      if (!token) return;
      void Promise.allSettled(legacy.map((id) => followApiRestaurant(id, token))).then(() =>
        fetchApiFollows(token)
          .then((list) =>
            setApiFollows(
              list.map((f) => ({
                restaurantId: f.restaurantId,
                notify: f.notify,
                at: f.followedAt ?? new Date().toISOString(),
              })),
            ),
          )
          .catch(() => {}),
      );
      return;
    }
    const current = readStored();
    const now = new Date().toISOString();
    const added = legacy
      .filter((id) => !current.some((f) => f.ownerKey === ownerKey && f.restaurantId === id))
      .map((restaurantId) => ({ ownerKey, restaurantId, notify: true, at: now }));
    if (added.length === 0) return;
    const next = [...current, ...added];
    writeStored(next);
    setStored(next);
  }, [isLoggedIn, ownerKey]);

  const follows = useMemo<FollowEntry[]>(() => {
    const list = hasRealBackend
      ? apiFollows
      : stored
          .filter((f) => f.ownerKey === ownerKey)
          .map(({ restaurantId, notify, at }) => ({ restaurantId, notify, at }));
    return [...list].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [apiFollows, stored, ownerKey]);

  const applyServerState = useCallback((s: ApiFollowState) => {
    setCounts((cur) => ({ ...cur, [s.restaurantId]: s.followersCount }));
  }, []);

  const toggleFollow = useCallback(
    (restaurantId: string): "ok" | "login" => {
      if (!isLoggedIn) return "login";
      const following = follows.some((f) => f.restaurantId === restaurantId);

      if (!hasRealBackend) {
        const current = readStored();
        const next = following
          ? current.filter((f) => !(f.ownerKey === ownerKey && f.restaurantId === restaurantId))
          : [...current, { ownerKey, restaurantId, notify: true, at: new Date().toISOString() }];
        writeStored(next);
        setStored(next);
        return "ok";
      }

      const token = getAuthToken();
      if (!token) return "login";
      const previous = apiFollows;
      // Otimista — volta atrás se o servidor recusar.
      setApiFollows((cur) =>
        following
          ? cur.filter((f) => f.restaurantId !== restaurantId)
          : [...cur, { restaurantId, notify: true, at: new Date().toISOString() }],
      );
      const request = following
        ? unfollowApiRestaurant(restaurantId, token)
        : followApiRestaurant(restaurantId, token);
      request.then(applyServerState).catch(() => setApiFollows(previous));
      return "ok";
    },
    [isLoggedIn, follows, ownerKey, apiFollows, applyServerState],
  );

  const setNotify = useCallback(
    (restaurantId: string, notify: boolean) => {
      if (!hasRealBackend) {
        const next = readStored().map((f) =>
          f.ownerKey === ownerKey && f.restaurantId === restaurantId ? { ...f, notify } : f,
        );
        writeStored(next);
        setStored(next);
        return;
      }
      const token = getAuthToken();
      if (!token) return;
      const previous = apiFollows;
      setApiFollows((cur) =>
        cur.map((f) => (f.restaurantId === restaurantId ? { ...f, notify } : f)),
      );
      setApiFollowNotify(restaurantId, notify, token)
        .then(applyServerState)
        .catch(() => setApiFollows(previous));
    },
    [ownerKey, apiFollows, applyServerState],
  );

  const followersCount = useCallback(
    (restaurantId: string, initial?: number) => {
      if (!hasRealBackend) return stored.filter((f) => f.restaurantId === restaurantId).length;
      return counts[restaurantId] ?? initial;
    },
    [stored, counts],
  );

  const value = useMemo<FollowsValue>(
    () => ({
      follows,
      isFollowing: (id) => follows.some((f) => f.restaurantId === id),
      isNotifying: (id) => follows.find((f) => f.restaurantId === id)?.notify ?? false,
      toggleFollow,
      setNotify,
      followersCount,
    }),
    [follows, toggleFollow, setNotify, followersCount],
  );

  return <FollowsContext.Provider value={value}>{children}</FollowsContext.Provider>;
}

export function useFollows() {
  const ctx = useContext(FollowsContext);
  if (!ctx) throw new Error("useFollows must be used inside FollowsProvider");
  return ctx;
}

/** Linhas de seguimento de demo de TODAS as contas deste browser — para o
 * gerador de notificações de demo saber quem avisar (ver
 * @/lib/notifications). */
export function getStoredFollows(): StoredFollow[] {
  return readStored();
}
