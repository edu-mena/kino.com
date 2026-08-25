import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import { getRestaurant } from "@/data/helpers";
import type { Restaurant } from "@/data/types";

const STORAGE_KEY = "kino_admin_restaurant";

/**
 * Sessão do painel do restaurante — completamente à parte da conta de
 * cliente (`useAuth`). Não há palavra-passe real (a app não tem backend):
 * "entrar" é escolher qual restaurante gerir, como uma demonstração.
 */
type RestaurantAdminValue = {
  managedRestaurantId: string | null;
  restaurant: Restaurant | undefined;
  /** false até o localStorage ser lido — evita o `AdminShell` redirecionar
   * pra `/admin/entrar` por engano antes da sessão guardada carregar (o
   * efeito dele, mais fundo na árvore, corre ANTES deste, que só sabe se
   * há sessão depois de montar). */
  hydrated: boolean;
  login: (restaurantId: string) => void;
  logout: () => void;
};

const RestaurantAdminContext = createContext<RestaurantAdminValue | null>(null);

export function RestaurantAdminProvider({ children }: { children: ReactNode }) {
  const [managedRestaurantId, setManagedRestaurantId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // `restaurant` abaixo é derivado (chama `getRestaurant`, que aplica as
  // edições de `/admin/perfil`) — sem isto, guardar uma edição não fazia
  // este provider voltar a renderizar, e o painel ficava com dados velhos
  // até a próxima navegação.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setManagedRestaurantId(stored);
    setHydrated(true);

    window.addEventListener("kino:menu-changed", forceUpdate);
    window.addEventListener("storage", forceUpdate);
    return () => {
      window.removeEventListener("kino:menu-changed", forceUpdate);
      window.removeEventListener("storage", forceUpdate);
    };
  }, []);

  const login = (restaurantId: string) => {
    setManagedRestaurantId(restaurantId);
    localStorage.setItem(STORAGE_KEY, restaurantId);
  };

  const logout = () => {
    setManagedRestaurantId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value: RestaurantAdminValue = {
    managedRestaurantId,
    restaurant: managedRestaurantId ? getRestaurant(managedRestaurantId) : undefined,
    hydrated,
    login,
    logout,
  };

  return (
    <RestaurantAdminContext.Provider value={value}>{children}</RestaurantAdminContext.Provider>
  );
}

export function useRestaurantAdmin() {
  const ctx = useContext(RestaurantAdminContext);
  if (!ctx) throw new Error("useRestaurantAdmin must be used inside RestaurantAdminProvider");
  return ctx;
}
