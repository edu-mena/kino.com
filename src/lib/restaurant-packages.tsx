import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import {
  createApiRestaurantPackage,
  deleteApiRestaurantPackage,
  fetchApiRestaurantPackages,
  updateApiRestaurantPackage,
} from "@/data/api-restaurant-packages";
import {
  addRestaurantPackage,
  getRestaurantPackages,
  removeRestaurantPackage,
  updateRestaurantPackage,
} from "@/data/restaurant-packages-store";
import type { RestaurantPackage } from "@/data/types";
import { hasRealBackend } from "@/lib/api-client";
import { getAdminToken, useManagedRestaurantId } from "@/lib/restaurant-admin";

type PackageFormInput = {
  packageTypeId: string;
  title?: string;
  description?: string;
  price: number;
  maxPeople?: number;
  characteristics: string[];
  isActive: boolean;
};

type RestaurantPackagesValue = {
  packagesByRestaurant: (restaurantId: string) => RestaurantPackage[];
  /** `ok: false` = a escrita falhou (ex: tipo de pacote inativo, erro de
   * rede). */
  addPackage: (restaurantId: string, input: PackageFormInput) => Promise<boolean>;
  updatePackage: (
    id: string,
    restaurantId: string,
    patch: Partial<PackageFormInput>,
  ) => Promise<boolean>;
  removePackage: (id: string) => Promise<boolean>;
};

const RestaurantPackagesContext = createContext<RestaurantPackagesValue | null>(null);

/**
 * Pacotes de consumo (Aniversário, Reunião de Negócios...) que cada
 * restaurante escolhe oferecer — mesmo desenho de `TablesProvider`:
 * montado na raiz (não só em `OperatorProviders`) porque a descoberta do
 * cliente (`/pacotes`, Fase L3d) também vai precisar de ler isto fora do
 * painel do restaurante. Por agora só `/admin/mesas` escreve;
 * `packagesByRestaurant` só devolve dados do restaurante do próprio painel
 * (`useManagedRestaurantId`), igual a `tablesByRestaurant`.
 */
export function RestaurantPackagesProvider({ children }: { children: ReactNode }) {
  const managedRestaurantId = useManagedRestaurantId();
  const [tick, bump] = useReducer((n: number) => n + 1, 0);
  const [apiPackages, setApiPackages] = useState<RestaurantPackage[]>([]);

  const refetchApi = () => {
    const token = getAdminToken();
    if (!managedRestaurantId) {
      setApiPackages([]);
      return;
    }
    fetchApiRestaurantPackages(managedRestaurantId, token)
      .then(setApiPackages)
      .catch(() => setApiPackages([]));
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

  const mockPackages = useMemo(
    () => (typeof window === "undefined" ? [] : getRestaurantPackages()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  const packages = hasRealBackend ? apiPackages : mockPackages;

  const value = useMemo<RestaurantPackagesValue>(() => {
    const forRestaurant = (restaurantId: string) =>
      packages.filter((p) => p.restaurantId === restaurantId);

    if (!hasRealBackend) {
      return {
        packagesByRestaurant: forRestaurant,
        addPackage: (restaurantId, input) => {
          addRestaurantPackage({ restaurantId, ...input });
          return Promise.resolve(true);
        },
        updatePackage: (id, _restaurantId, patch) => {
          updateRestaurantPackage(id, patch);
          return Promise.resolve(true);
        },
        removePackage: (id) => {
          removeRestaurantPackage(id);
          return Promise.resolve(true);
        },
      };
    }

    return {
      packagesByRestaurant: forRestaurant,
      addPackage: async (restaurantId, input) => {
        const token = getAdminToken();
        if (!token) return false;
        try {
          const { packageTypeId, ...rest } = input;
          await createApiRestaurantPackage(restaurantId, { packageTypeId, ...rest }, token);
          refetchApi();
          return true;
        } catch {
          return false;
        }
      },
      updatePackage: async (id, restaurantId, patch) => {
        const token = getAdminToken();
        if (!token) return false;
        try {
          await updateApiRestaurantPackage(id, restaurantId, patch, token);
          refetchApi();
          return true;
        } catch {
          return false;
        }
      },
      removePackage: async (id) => {
        const token = getAdminToken();
        if (!token) return false;
        try {
          await deleteApiRestaurantPackage(id, token);
          refetchApi();
          return true;
        } catch {
          return false;
        }
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages]);

  return (
    <RestaurantPackagesContext.Provider value={value}>
      {children}
    </RestaurantPackagesContext.Provider>
  );
}

export function useRestaurantPackages() {
  const ctx = useContext(RestaurantPackagesContext);
  if (!ctx) throw new Error("useRestaurantPackages must be used inside RestaurantPackagesProvider");
  return ctx;
}
