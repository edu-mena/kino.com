import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "kino_menu_unavailable";

/**
 * Disponibilidade de pratos, gerida pelo painel do restaurante
 * (`/admin/cardapio`) — só guarda os IDs marcados como indisponíveis (a
 * maioria fica disponível por omissão, sem precisar de entrada nenhuma).
 * `DishCard`/`MenuBrowser` leem isto pra desativar o "+" e mostrar
 * "Indisponível" nos pratos que o restaurante desligou.
 */
type MenuAdminValue = {
  unavailableIds: string[];
  isAvailable: (menuItemId: string) => boolean;
  toggleAvailability: (menuItemId: string) => void;
};

const MenuAdminContext = createContext<MenuAdminValue | null>(null);

export function MenuAdminProvider({ children }: { children: ReactNode }) {
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUnavailableIds(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unavailableIds));
  }, [unavailableIds, hydrated]);

  const value: MenuAdminValue = {
    unavailableIds,
    isAvailable: (menuItemId) => !unavailableIds.includes(menuItemId),
    toggleAvailability: (menuItemId) =>
      setUnavailableIds((prev) =>
        prev.includes(menuItemId) ? prev.filter((id) => id !== menuItemId) : [...prev, menuItemId],
      ),
  };

  return <MenuAdminContext.Provider value={value}>{children}</MenuAdminContext.Provider>;
}

export function useMenuAdmin() {
  const ctx = useContext(MenuAdminContext);
  if (!ctx) throw new Error("useMenuAdmin must be used inside MenuAdminProvider");
  return ctx;
}
