import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createApiPackageType,
  deleteApiPackageType,
  fetchApiPackageTypes,
  updateApiPackageType,
} from "@/data/api-package-types";
import {
  createPackageType,
  deletePackageType,
  getEffectivePackageTypes,
  updatePackageType,
} from "@/data/package-types-store";
import type { PackageType } from "@/data/types";
import { hasRealBackend } from "@/lib/api-client";
import { useSystemAdmin } from "@/lib/system-admin";

type PackageTypeInput = Omit<PackageType, "id">;

type PackageTypesAdminValue = {
  /** Todos os tipos, incluindo inativos — `/sistema/pacotes` precisa de
   * conseguir reativar um tipo desativado, por isso nunca filtra aqui. */
  packageTypes: PackageType[];
  /** `ok: false` = a escrita falhou (ex: nome duplicado, erro de rede). */
  createPackageType: (input: PackageTypeInput) => Promise<boolean>;
  updatePackageType: (id: string, patch: Partial<PackageTypeInput>) => Promise<boolean>;
  deletePackageType: (id: string) => Promise<boolean>;
};

const PackageTypesAdminContext = createContext<PackageTypesAdminValue | null>(null);

/**
 * Vive dentro de `OperatorProviders` (montado em `/sistema/*`) — mesmo
 * desenho de `OffersAdminProvider`. Só o operador de sistema escreve; a
 * leitura pública (Fase L3d) não passa por aqui, usa `fetchApiPackageTypes`
 * diretamente sem token.
 */
export function PackageTypesAdminProvider({ children }: { children: ReactNode }) {
  const { token: operatorToken } = useSystemAdmin();
  const [apiTypes, setApiTypes] = useState<PackageType[]>([]);
  const [mockTypes, setMockTypes] = useState<PackageType[]>(
    hasRealBackend ? [] : getEffectivePackageTypes(),
  );

  const refetchApi = () => {
    fetchApiPackageTypes(operatorToken ?? undefined)
      .then(setApiTypes)
      .catch(() => setApiTypes([]));
  };

  useEffect(() => {
    if (hasRealBackend) {
      refetchApi();
      return;
    }
    const sync = () => setMockTypes(getEffectivePackageTypes());
    sync();
    window.addEventListener("luku:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("luku:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorToken]);

  const packageTypes = hasRealBackend ? apiTypes : mockTypes;

  const value: PackageTypesAdminValue = hasRealBackend
    ? {
        packageTypes,
        createPackageType: async (input) => {
          if (!operatorToken) return false;
          try {
            await createApiPackageType(input, operatorToken);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        updatePackageType: async (id, patch) => {
          if (!operatorToken) return false;
          try {
            await updateApiPackageType(id, patch, operatorToken);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        deletePackageType: async (id) => {
          if (!operatorToken) return false;
          try {
            await deleteApiPackageType(id, operatorToken);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
      }
    : {
        packageTypes,
        createPackageType: (input) => {
          createPackageType(input);
          return Promise.resolve(true);
        },
        updatePackageType: (id, patch) => {
          updatePackageType(id, patch);
          return Promise.resolve(true);
        },
        deletePackageType: (id) => {
          deletePackageType(id);
          return Promise.resolve(true);
        },
      };

  return (
    <PackageTypesAdminContext.Provider value={value}>{children}</PackageTypesAdminContext.Provider>
  );
}

export function usePackageTypesAdmin() {
  const ctx = useContext(PackageTypesAdminContext);
  if (!ctx) throw new Error("usePackageTypesAdmin must be used inside PackageTypesAdminProvider");
  return ctx;
}
