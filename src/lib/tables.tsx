import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { createApiTable, deleteApiTable, fetchApiTables, updateApiTable } from "@/data/api-tables";
import {
  addTable,
  getTables,
  removeTable,
  seedTables,
  updateTable,
  type RestaurantTable,
} from "@/data/tables-store";
import { hasRealBackend } from "@/lib/api-client";
import { getAdminToken, useManagedRestaurantId } from "@/lib/restaurant-admin";

type TablesValue = {
  tables: RestaurantTable[];
  tablesByRestaurant: (restaurantId: string) => RestaurantTable[];
  totalSeats: (restaurantId: string) => number;
  tableCount: (restaurantId: string) => number;
  addTable: (input: Omit<RestaurantTable, "id">) => void;
  updateTable: (id: string, patch: Partial<Omit<RestaurantTable, "id" | "restaurantId">>) => void;
  removeTable: (id: string) => void;
};

const TablesContext = createContext<TablesValue | null>(null);

/**
 * Mesas da sala de cada restaurante. Com backend real, fala com a API
 * (ver @/data/api-tables), escopada ao restaurante do painel
 * (`useManagedRestaurantId()` — `null` em páginas de cliente; não dá para
 * usar `useRestaurantAdminOptional` aqui, este provider é ancestral de
 * `RestaurantAdminProvider` na árvore, ver `@/lib/restaurant-admin`):
 * `tablesByRestaurant` só devolve dados para o restaurante do próprio
 * painel; para qualquer outro (ex: cliente a reservar noutro restaurante),
 * devolve `[]` — `totalSeats` cai então a 0 e `reservation-dialog.tsx` já
 * trata isso como "capacidade desconhecida" (não bloqueia a reserva), o
 * mesmo que já acontecia sem mesas configuradas. Sem backend, mantém-se o
 * mock local de sempre.
 */
export function TablesProvider({ children }: { children: ReactNode }) {
  const managedRestaurantId = useManagedRestaurantId();
  const [tick, bump] = useReducer((n: number) => n + 1, 0);
  const [apiTables, setApiTables] = useState<RestaurantTable[]>([]);

  const refetchApi = () => {
    const token = getAdminToken();
    if (!managedRestaurantId || !token) {
      setApiTables([]);
      return;
    }
    fetchApiTables(managedRestaurantId, token)
      .then(setApiTables)
      .catch(() => setApiTables([]));
  };

  useEffect(() => {
    if (hasRealBackend) {
      refetchApi();
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedRestaurantId]);

  useEffect(() => {
    if (hasRealBackend) return;
    window.addEventListener("luku:menu-changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("luku:menu-changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const mockTables = useMemo(
    () => (typeof window === "undefined" ? seedTables() : getTables()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  const tables = hasRealBackend ? apiTables : mockTables;

  const value = useMemo<TablesValue>(() => {
    const forRestaurant = (restaurantId: string) =>
      tables
        .filter((tbl) => tbl.restaurantId === restaurantId)
        .sort((a, b) => a.name.localeCompare(b.name, "pt", { numeric: true }));
    const base = {
      tables,
      tablesByRestaurant: forRestaurant,
      totalSeats: (restaurantId: string) =>
        forRestaurant(restaurantId).reduce((sum, tbl) => sum + tbl.seats, 0),
      tableCount: (restaurantId: string) => forRestaurant(restaurantId).length,
    };
    if (!hasRealBackend) {
      return { ...base, addTable, updateTable, removeTable };
    }
    return {
      ...base,
      addTable: (input) => {
        const token = getAdminToken();
        if (!token) return;
        const { restaurantId, ...rest } = input;
        void createApiTable(restaurantId, rest, token).then(refetchApi);
      },
      updateTable: (id, patch) => {
        const token = getAdminToken();
        const item = tables.find((t) => t.id === id);
        if (!token || !item) return;
        void updateApiTable(id, item.restaurantId, patch, token).then(refetchApi);
      },
      removeTable: (id) => {
        const token = getAdminToken();
        if (!token) return;
        void deleteApiTable(id, token).then(refetchApi);
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables]);

  return <TablesContext.Provider value={value}>{children}</TablesContext.Provider>;
}

export function useTables() {
  const ctx = useContext(TablesContext);
  if (!ctx) throw new Error("useTables must be used inside TablesProvider");
  return ctx;
}
