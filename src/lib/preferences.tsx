import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Preferences = {
  favoriteRestaurantIds: string[];
  dietaryRestrictions: string[];
  priceRange: string | null;
  cuisinePreferences: string[];
  servicePreferences: string[];
  language: string;
  favoriteIngredients: string[];
  excludedIngredients: string[];
};

const DEFAULT_PREFERENCES: Preferences = {
  favoriteRestaurantIds: [],
  dietaryRestrictions: [],
  priceRange: null,
  cuisinePreferences: [],
  servicePreferences: [],
  language: "pt",
  favoriteIngredients: [],
  excludedIngredients: [],
};

type PreferencesValue = Preferences & {
  isFavoriteRestaurant: (restaurantId: string) => boolean;
  toggleFavoriteRestaurant: (restaurantId: string) => void;
  setDietaryRestrictions: (list: string[]) => void;
  setPriceRange: (value: string | null) => void;
  setCuisinePreferences: (list: string[]) => void;
  setServicePreferences: (list: string[]) => void;
  setLanguage: (value: string) => void;
  toggleFavoriteIngredient: (name: string) => void;
  toggleExcludedIngredient: (name: string) => void;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

const STORAGE_KEY = "kino_preferences";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setPrefs({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const persist = (next: Preferences) => {
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const value: PreferencesValue = {
    ...prefs,
    isFavoriteRestaurant: (restaurantId) => prefs.favoriteRestaurantIds.includes(restaurantId),
    toggleFavoriteRestaurant: (restaurantId) =>
      persist({
        ...prefs,
        favoriteRestaurantIds: prefs.favoriteRestaurantIds.includes(restaurantId)
          ? prefs.favoriteRestaurantIds.filter((id) => id !== restaurantId)
          : [...prefs.favoriteRestaurantIds, restaurantId],
      }),
    setDietaryRestrictions: (list) => persist({ ...prefs, dietaryRestrictions: list }),
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
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}
