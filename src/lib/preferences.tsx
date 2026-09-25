import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  favoriteApiMenuItem,
  fetchApiFavoriteMenuItems,
  syncApiFavoriteMenuItems,
  unfavoriteApiMenuItem,
} from "@/data/api-favorites";
import { fetchApiPreferences, updateApiPreferences } from "@/data/api-preferences";
import { hasRealBackend } from "@/lib/api-client";
import { getAuthToken, useAuth } from "@/lib/auth";

export type NotificationSettings = {
  orderUpdates: boolean;
  promotions: boolean;
  news: boolean;
};

/** Favoritos são só pratos/bebidas — restaurantes passaram a ser
 * SEGUIDOS (ver @/lib/follows, que migra os antigos
 * `favoriteRestaurantIds` guardados aqui). */
export type Preferences = {
  favoriteDishIds: string[];
  dietaryRestrictions: string[];
  priceRange: string | null;
  cuisinePreferences: string[];
  servicePreferences: string[];
  language: string;
  favoriteIngredients: string[];
  excludedIngredients: string[];
  notificationSettings: NotificationSettings;
};

const DEFAULT_PREFERENCES: Preferences = {
  favoriteDishIds: [],
  dietaryRestrictions: [],
  priceRange: null,
  cuisinePreferences: [],
  servicePreferences: [],
  language: "pt",
  favoriteIngredients: [],
  excludedIngredients: [],
  notificationSettings: { orderUpdates: true, promotions: true, news: false },
};

type PreferencesValue = Preferences & {
  isFavoriteDish: (dishId: string) => boolean;
  toggleFavoriteDish: (dishId: string) => void;
  setDietaryRestrictions: (list: string[]) => void;
  setPriceRange: (value: string | null) => void;
  setCuisinePreferences: (list: string[]) => void;
  setServicePreferences: (list: string[]) => void;
  setLanguage: (value: string) => void;
  toggleFavoriteIngredient: (name: string) => void;
  toggleExcludedIngredient: (name: string) => void;
  setNotificationSetting: (key: keyof NotificationSettings, value: boolean) => void;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

const STORAGE_KEY = "luku_preferences";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const { favoriteRestaurantIds: _legacy, ...rest } = JSON.parse(stored) as Partial<
        Preferences & { favoriteRestaurantIds: string[] }
      >;
      setPrefs({ ...DEFAULT_PREFERENCES, ...rest });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // `dietaryRestrictions` e os pratos/bebidas favoritos são os campos aqui
  // com equivalente real no backend (ver @/data/api-preferences e
  // @/data/api-favorites) — as outras preferências (faixa de preço, etc.)
  // continuam só em localStorage. Sem
  // isto, a conta "esquecia" as restrições ao trocar de browser/
  // dispositivo, e o card de onboarding (@/lib/tutorial) reaparecia
  // sempre — o próprio bug reportado.
  useEffect(() => {
    if (!hasRealBackend || !isLoggedIn) return;
    const token = getAuthToken();
    if (!token) return;
    fetchApiPreferences(token)
      .then(({ dietaryRestrictions }) => {
        setPrefs((cur) => ({ ...cur, dietaryRestrictions }));
      })
      .catch(() => {
        // best-effort — mantém o que já estava em localStorage
      });
  }, [isLoggedIn]);

  // Pratos/bebidas favoritos acompanham a conta (backend real): no login,
  // os que estavam guardados só neste browser juntam-se aos da conta (nunca
  // os substituem), e a lista da conta passa a ser a verdade daqui em diante.
  useEffect(() => {
    if (!hasRealBackend || !isLoggedIn) return;
    const token = getAuthToken();
    if (!token) return;
    let local: string[] = [];
    try {
      local =
        (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as { favoriteDishIds?: string[] })
          .favoriteDishIds ?? [];
    } catch {
      local = [];
    }
    const request =
      local.length > 0 ? syncApiFavoriteMenuItems(local, token) : fetchApiFavoriteMenuItems(token);
    request.then(applyServerFavorites).catch(() => {
      // best-effort — continua com a lista local
    });
  }, [isLoggedIn]);

  /** Lista de favoritos devolvida pelo servidor vira a verdade local. */
  function applyServerFavorites(ids: string[]) {
    setPrefs((cur) => {
      const next = { ...cur, favoriteDishIds: ids };
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as object;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, favoriteDishIds: ids }));
      } catch {
        // localStorage indisponível — fica só em memória
      }
      return next;
    });
  }

  const persist = (next: Preferences) => {
    setPrefs(next);
    // Mantém os favoritos de restaurante antigos até @/lib/follows os
    // migrar para "seguir" (no 1º login) — sem isto, mudar uma preferência
    // ainda como convidado apagava-os antes da migração.
    let legacy: string[] | undefined;
    try {
      legacy = (
        JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as {
          favoriteRestaurantIds?: string[];
        }
      ).favoriteRestaurantIds;
    } catch {
      legacy = undefined;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(legacy ? { ...next, favoriteRestaurantIds: legacy } : next),
    );
  };

  const value: PreferencesValue = {
    ...prefs,
    isFavoriteDish: (dishId) => prefs.favoriteDishIds.includes(dishId),
    toggleFavoriteDish: (dishId) => {
      const wasFavorite = prefs.favoriteDishIds.includes(dishId);
      persist({
        ...prefs,
        favoriteDishIds: wasFavorite
          ? prefs.favoriteDishIds.filter((id) => id !== dishId)
          : [...prefs.favoriteDishIds, dishId],
      });
      // Convidado: fica só neste browser até entrar (ver sync acima).
      if (!hasRealBackend || !isLoggedIn) return;
      const token = getAuthToken();
      if (!token) return;
      const request = wasFavorite
        ? unfavoriteApiMenuItem(dishId, token)
        : favoriteApiMenuItem(dishId, token);
      request.then(applyServerFavorites).catch(() => {
        // best-effort — a UI já refletiu localmente; o próximo login volta a sincronizar
      });
    },
    setDietaryRestrictions: (list) => {
      persist({ ...prefs, dietaryRestrictions: list });
      if (!hasRealBackend) return;
      const token = getAuthToken();
      if (!token) return;
      void updateApiPreferences({ dietary_restrictions: list }, token).catch(() => {
        // best-effort — a UI já refletiu localmente; tenta de novo na
        // próxima mudança/login
      });
    },
    setPriceRange: (value) => persist({ ...prefs, priceRange: value }),
    setCuisinePreferences: (list) => persist({ ...prefs, cuisinePreferences: list }),
    setServicePreferences: (list) => persist({ ...prefs, servicePreferences: list }),
    setLanguage: (value) => persist({ ...prefs, language: value }),
    // Um ingrediente não pode estar nas duas listas ao mesmo tempo (favorito e
    // banido) — escolher um remove-o automaticamente da outra.
    toggleFavoriteIngredient: (name) =>
      persist({
        ...prefs,
        favoriteIngredients: prefs.favoriteIngredients.includes(name)
          ? prefs.favoriteIngredients.filter((n) => n !== name)
          : [...prefs.favoriteIngredients, name],
        excludedIngredients: prefs.excludedIngredients.filter((n) => n !== name),
      }),
    toggleExcludedIngredient: (name) =>
      persist({
        ...prefs,
        excludedIngredients: prefs.excludedIngredients.includes(name)
          ? prefs.excludedIngredients.filter((n) => n !== name)
          : [...prefs.excludedIngredients, name],
        favoriteIngredients: prefs.favoriteIngredients.filter((n) => n !== name),
      }),
    setNotificationSetting: (key, value) =>
      persist({
        ...prefs,
        notificationSettings: { ...prefs.notificationSettings, [key]: value },
      }),
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}
