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
  approveApiPartnerApplication,
  deleteApiPartnerApplication,
  fetchApiPartnerApplications,
  rejectApiPartnerApplication,
} from "@/data/api-partner-apps";
import {
  getPartnerApps,
  removePartnerApp,
  seedPartnerApps,
  setPartnerAppStatus,
  type PartnerApplication,
  type PartnerAppStatus,
} from "@/data/partner-apps-store";
import { hasRealBackend } from "@/lib/api-client";
import type { Restaurant } from "@/data/types";
import { useSystemAdmin } from "./system-admin";

type PartnerAppsValue = {
  applications: PartnerApplication[];
  counts: Record<PartnerAppStatus, number>;
  /** Com backend real, aprova mesmo (cria restaurante/subscrição/mesas/conta
   * do dono no servidor) e devolve o restaurante criado — usado para o
   * atalho "entrar no painel" a seguir a aprovar. Sem backend, é só o mock
   * de sempre (quem cria o restaurante local é o caller). */
  approve: (id: string) => Promise<Restaurant | undefined>;
  reject: (id: string) => void;
  remove: (id: string) => void;
};

const PartnerAppsContext = createContext<PartnerAppsValue | null>(null);

/** Ligado à API real — lista vem do servidor, mutações chamam os endpoints
 * system_operator-only e voltam a pedir a lista para refletir o estado real. */
function useApiPartnerApps(token: string | null): PartnerAppsValue {
  const [applications, setApplications] = useState<PartnerApplication[]>([]);

  const refetch = async () => {
    if (!token) return;
    try {
      setApplications(await fetchApiPartnerApplications(token));
    } catch {
      // Falha de rede/permissão — mantém a lista anterior em vez de a esvaziar.
    }
  };

  useEffect(() => {
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const counts = useMemo(() => {
    const c: Record<PartnerAppStatus, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const a of applications) c[a.status] += 1;
    return c;
  }, [applications]);

  return {
    applications,
    counts,
    approve: async (id) => {
      if (!token) return undefined;
      const restaurant = await approveApiPartnerApplication(id, token);
      await refetch();
      return restaurant;
    },
    reject: (id) => {
      if (!token) return;
      void rejectApiPartnerApplication(id, token).then(refetch);
    },
    remove: (id) => {
      if (!token) return;
      void deleteApiPartnerApplication(id, token).then(refetch);
    },
  };
}

/** Sem backend (demo/dev) — mock síncrono de sempre, em localStorage. */
function useMockPartnerApps(): PartnerAppsValue {
  const [tick, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    window.addEventListener("luku:menu-changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("luku:menu-changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const applications = useMemo(
    () => (typeof window === "undefined" ? seedPartnerApps() : getPartnerApps()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  return useMemo<PartnerAppsValue>(() => {
    const counts: Record<PartnerAppStatus, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const a of applications) counts[a.status] += 1;
    return {
      applications,
      counts,
      approve: (id) => {
        setPartnerAppStatus(id, "approved");
        return Promise.resolve(undefined);
      },
      reject: (id) => setPartnerAppStatus(id, "rejected"),
      remove: removePartnerApp,
    };
  }, [applications]);
}

export function PartnerAppsProvider({ children }: { children: ReactNode }) {
  const { token } = useSystemAdmin();
  const apiValue = useApiPartnerApps(token);
  const mockValue = useMockPartnerApps();
  const value = hasRealBackend ? apiValue : mockValue;

  return <PartnerAppsContext.Provider value={value}>{children}</PartnerAppsContext.Provider>;
}

export function usePartnerApps() {
  const ctx = useContext(PartnerAppsContext);
  if (!ctx) throw new Error("usePartnerApps must be used inside PartnerAppsProvider");
  return ctx;
}
