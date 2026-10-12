import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import {
  createApiCombination,
  createApiTable,
  createApiTablesBulk,
  deleteApiCombination,
  deleteApiTable,
  fetchApiCombinations,
  fetchApiTables,
  reorderApiTables,
  updateApiCombination,
  updateApiTable,
} from "@/data/api-tables";
import {
  addCombination as addMockCombination,
  addTable as addMockTable,
  addTablesBulk as addMockTablesBulk,
  compareTables,
  getCombinations as getMockCombinations,
  getTables,
  removeCombination as removeMockCombination,
  removeTable as removeMockTable,
  reorderTables as reorderMockTables,
  seedTables,
  updateCombination as updateMockCombination,
  updateTable as updateMockTable,
  type RestaurantTable,
  type TableCombination,
  type TableInput,
  type TablePatch,
  type TableShape,
} from "@/data/tables-store";
import { hasRealBackend } from "@/lib/api-client";
import { getAdminToken, useManagedRestaurantId } from "@/lib/restaurant-admin";
import { addDaysIso, isTableActive, localIsoDate } from "@/lib/table-layout";

export type BulkTablesSpec = {
  prefix: string;
  start: number;
  count: number;
  seats: number;
  area?: string;
  shape?: TableShape;
};

export type CombinationInput = { date: string; tableIds: string[]; seats?: number; label?: string };

type TablesValue = {
  tables: RestaurantTable[];
  /** Todas as mesas do restaurante (incl. fora de serviço), pela ordem da sala. */
  tablesByRestaurant: (restaurantId: string) => RestaurantTable[];
  /** Lugares das mesas EM SERVIÇO (base da lotação das reservas). */
  totalSeats: (restaurantId: string) => number;
  /** Mesas em serviço. */
  tableCount: (restaurantId: string) => number;
  /** Junções por dia do restaurante do painel (de ontem a +120 dias). */
  combinations: TableCombination[];
  loaded: boolean;
  addTable: (input: TableInput) => Promise<RestaurantTable | null>;
  addTablesBulk: (restaurantId: string, spec: BulkTablesSpec) => Promise<RestaurantTable[] | null>;
  updateTable: (id: string, patch: TablePatch) => Promise<boolean>;
  reorderTables: (restaurantId: string, ids: string[]) => Promise<boolean>;
  removeTable: (id: string) => Promise<boolean>;
  combineTables: (restaurantId: string, input: CombinationInput) => Promise<string | true>;
  updateCombination: (
    id: string,
    patch: { seats?: number; label?: string; tableIds?: string[] },
  ) => Promise<string | true>;
  separateCombination: (id: string) => Promise<boolean>;
};

const TablesContext = createContext<TablesValue | null>(null);

/** Mensagem da API (422 com texto útil, ex.: "Estas mesas não podem ser
 * juntas: Sofá 1.") ou `false` para o genérico. */
function apiMessage(error: unknown): string | false {
  const e = error as { status?: number; message?: string; errors?: Record<string, string[]> };
  if (e?.status === 422) {
    const first = e.errors ? Object.values(e.errors)[0]?.[0] : undefined;
    return first ?? e.message ?? false;
  }
  return false;
}

/**
 * Mesas da sala de cada restaurante + junções por dia. Com backend real,
 * fala com a API (ver @/data/api-tables), escopada ao restaurante do painel
 * (`useManagedRestaurantId()` — `null` em páginas de cliente; não dá para
 * usar `useRestaurantAdminOptional` aqui, este provider é ancestral de
 * `RestaurantAdminProvider` na árvore, ver `@/lib/restaurant-admin`):
 * `tablesByRestaurant` só devolve dados para o restaurante do próprio
 * painel; para qualquer outro (ex: cliente a reservar noutro restaurante),
 * devolve `[]` — `totalSeats` cai então a 0 e `reservation-dialog.tsx` já
 * trata isso como "capacidade desconhecida" (não bloqueia a reserva), o
 * mesmo que já acontecia sem mesas configuradas. Sem backend, mantém-se o
 * mock local de sempre.
 *
 * As ações devolvem uma Promise (sucesso/falha) — antes eram "dispara e
 * esquece" e o painel mostrava "Mesa guardada" mesmo quando a API recusava.
 */
export function TablesProvider({ children }: { children: ReactNode }) {
  const managedRestaurantId = useManagedRestaurantId();
  const [tick, bump] = useReducer((n: number) => n + 1, 0);
  const [apiTables, setApiTables] = useState<RestaurantTable[]>([]);
  const [apiCombos, setApiCombos] = useState<TableCombination[]>([]);
  const [loaded, setLoaded] = useState(!hasRealBackend);

  const refetchApi = useCallback(async () => {
    const token = getAdminToken();
    if (!managedRestaurantId || !token) {
      setApiTables([]);
      setApiCombos([]);
      return;
    }
    const today = localIsoDate();
    const [tablesResult, combosResult] = await Promise.allSettled([
      fetchApiTables(managedRestaurantId, token),
      fetchApiCombinations(
        managedRestaurantId,
        { from: addDaysIso(today, -1), to: addDaysIso(today, 120) },
        token,
      ),
    ]);
    setApiTables(tablesResult.status === "fulfilled" ? tablesResult.value : []);
    setApiCombos(combosResult.status === "fulfilled" ? combosResult.value : []);
    setLoaded(true);
  }, [managedRestaurantId]);

  useEffect(() => {
    if (hasRealBackend) void refetchApi();
  }, [refetchApi]);

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
  const mockCombos = useMemo(
    () => (managedRestaurantId ? getMockCombinations(managedRestaurantId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, managedRestaurantId],
  );

  const tables = hasRealBackend ? apiTables : mockTables;
  const combinations = hasRealBackend ? apiCombos : mockCombos;

  const value = useMemo<TablesValue>(() => {
    const forRestaurant = (restaurantId: string) =>
      tables.filter((tbl) => tbl.restaurantId === restaurantId).sort(compareTables);
    const base = {
      tables,
      combinations,
      loaded,
      tablesByRestaurant: forRestaurant,
      totalSeats: (restaurantId: string) =>
        forRestaurant(restaurantId)
          .filter(isTableActive)
          .reduce((sum, tbl) => sum + tbl.seats, 0),
      tableCount: (restaurantId: string) =>
        forRestaurant(restaurantId).filter(isTableActive).length,
    };

    if (!hasRealBackend) {
      return {
        ...base,
        addTable: async (input) => addMockTable(input),
        addTablesBulk: async (restaurantId, spec) => addMockTablesBulk(restaurantId, spec),
        updateTable: async (id, patch) => {
          updateMockTable(id, patch);
          return true;
        },
        reorderTables: async (restaurantId, ids) => {
          reorderMockTables(restaurantId, ids);
          return true;
        },
        removeTable: async (id) => {
          removeMockTable(id);
          return true;
        },
        combineTables: async (restaurantId, input) => {
          const all = getMockCombinations(restaurantId);
          const clash = all.some(
            (c) => c.date === input.date && c.tableIds.some((id) => input.tableIds.includes(id)),
          );
          if (clash) return "clash";
          const seats =
            input.seats ??
            tables.filter((t) => input.tableIds.includes(t.id)).reduce((n, t) => n + t.seats, 0);
          addMockCombination({
            restaurantId,
            date: input.date,
            tableIds: input.tableIds,
            seats,
            ...(input.label ? { label: input.label } : {}),
          });
          return true;
        },
        updateCombination: async (id, patch) => {
          updateMockCombination(id, patch);
          return true;
        },
        separateCombination: async (id) => {
          removeMockCombination(id);
          return true;
        },
      };
    }

    const withToken = async <T,>(fn: (token: string) => Promise<T>): Promise<T | null> => {
      const token = getAdminToken();
      if (!token) return null;
      try {
        return await fn(token);
      } catch {
        return null;
      }
    };

    return {
      ...base,
      addTable: async (input) => {
        const { restaurantId, ...rest } = input;
        const created = await withToken((token) => createApiTable(restaurantId, rest, token));
        await refetchApi();
        return created;
      },
      addTablesBulk: async (restaurantId, spec) => {
        const created = await withToken((token) => createApiTablesBulk(restaurantId, spec, token));
        await refetchApi();
        return created;
      },
      updateTable: async (id, patch) => {
        const item = tables.find((t) => t.id === id);
        if (!item) return false;
        // Otimista: o switch "em serviço" responde já, a API confirma depois.
        setApiTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        const ok = await withToken((token) => updateApiTable(id, item.restaurantId, patch, token));
        await refetchApi();
        return ok !== null;
      },
      reorderTables: async (restaurantId, ids) => {
        const pos = new Map(ids.map((id, i) => [id, i + 1]));
        setApiTables((prev) =>
          prev.map((t) => (pos.has(t.id) ? { ...t, sortOrder: pos.get(t.id) ?? 0 } : t)),
        );
        const ok = await withToken(async (token) => {
          await reorderApiTables(restaurantId, ids, token);
          return true;
        });
        await refetchApi();
        return ok !== null;
      },
      removeTable: async (id) => {
        const ok = await withToken(async (token) => {
          await deleteApiTable(id, token);
          return true;
        });
        await refetchApi();
        return ok !== null;
      },
      combineTables: async (restaurantId, input) => {
        const token = getAdminToken();
        if (!token) return "error";
        try {
          await createApiCombination(restaurantId, input, token);
          await refetchApi();
          return true;
        } catch (error) {
          return apiMessage(error) || "error";
        }
      },
      updateCombination: async (id, patch) => {
        const token = getAdminToken();
        const combo = combinations.find((c) => c.id === id);
        if (!token || !combo) return "error";
        try {
          await updateApiCombination(id, combo.restaurantId, patch, token);
          await refetchApi();
          return true;
        } catch (error) {
          return apiMessage(error) || "error";
        }
      },
      separateCombination: async (id) => {
        const ok = await withToken(async (token) => {
          await deleteApiCombination(id, token);
          return true;
        });
        await refetchApi();
        return ok !== null;
      },
    };
  }, [tables, combinations, loaded, refetchApi]);

  return <TablesContext.Provider value={value}>{children}</TablesContext.Provider>;
}

export function useTables() {
  const ctx = useContext(TablesContext);
  if (!ctx) throw new Error("useTables must be used inside TablesProvider");
  return ctx;
}
