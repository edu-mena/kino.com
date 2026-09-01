import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import {
  addTable,
  getTables,
  removeTable,
  seedTables,
  updateTable,
  type RestaurantTable,
} from "@/data/tables-store";

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

export function TablesProvider({ children }: { children: ReactNode }) {
  const [tick, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    window.addEventListener("kino:menu-changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("kino:menu-changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const tables = useMemo(
    () => (typeof window === "undefined" ? seedTables() : getTables()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  const value = useMemo<TablesValue>(() => {
    const forRestaurant = (restaurantId: string) =>
      tables
        .filter((tbl) => tbl.restaurantId === restaurantId)
        .sort((a, b) => a.name.localeCompare(b.name, "pt", { numeric: true }));
    return {
      tables,
      tablesByRestaurant: forRestaurant,
      totalSeats: (restaurantId) =>
        forRestaurant(restaurantId).reduce((sum, tbl) => sum + tbl.seats, 0),
      tableCount: (restaurantId) => forRestaurant(restaurantId).length,
      addTable,
      updateTable,
      removeTable,
    };
  }, [tables]);

  return <TablesContext.Provider value={value}>{children}</TablesContext.Provider>;
}

export function useTables() {
  const ctx = useContext(TablesContext);
  if (!ctx) throw new Error("useTables must be used inside TablesProvider");
  return ctx;
}
