import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Preferences = {
  favoriteRestaurantIds: string[];
  dietaryRestrictions: string[];
  priceRange: string | null;
  cuisinePreferences: string[];
  locationPreferences: string[];
  servicePreferences: string[];
};

const DEFAULT_PREFERENCES: Preferences = {
  favoriteRestaurantIds: [],
  dietaryRestrictions: [],
  priceRange: null,
  cuisinePreferences: [],
  locationPreferences: [],
  servicePreferences: [],
};

type PreferencesValue = Preferences & {
  isFavoriteRestaurant: (restaurantId: string) => boolean;
  toggleFavoriteRestaurant: (restaurantId: string) => void;
  setDietaryRestrictions: (list: string[]) => void;
  setPriceRange: (value: string | null) => void;
  setCuisinePreferences: (list: string[]) => void;
  setLocationPreferences: (list: string[]) => void;
  setServicePreferences: (list: string[]) => void;
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
    setLocationPreferences: (list) => persist({ ...prefs, locationPreferences: list }),
    setServicePreferences: (list) => persist({ ...prefs, servicePreferences: list }),
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}
