import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import {
  getPartnerApps,
  removePartnerApp,
  seedPartnerApps,
  setPartnerAppStatus,
  type PartnerApplication,
  type PartnerAppStatus,
} from "@/data/partner-apps-store";

type PartnerAppsValue = {
  applications: PartnerApplication[];
  counts: Record<PartnerAppStatus, number>;
  approve: (id: string) => void;
  reject: (id: string) => void;
  remove: (id: string) => void;
};

const PartnerAppsContext = createContext<PartnerAppsValue | null>(null);

export function PartnerAppsProvider({ children }: { children: ReactNode }) {
  const [tick, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    window.addEventListener("kino:menu-changed", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("kino:menu-changed", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const applications = useMemo(
    () => (typeof window === "undefined" ? seedPartnerApps() : getPartnerApps()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  const value = useMemo<PartnerAppsValue>(() => {
    const counts: Record<PartnerAppStatus, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const a of applications) counts[a.status] += 1;
    return {
      applications,
      counts,
      approve: (id) => setPartnerAppStatus(id, "approved"),
      reject: (id) => setPartnerAppStatus(id, "rejected"),
      remove: removePartnerApp,
    };
  }, [applications]);

  return <PartnerAppsContext.Provider value={value}>{children}</PartnerAppsContext.Provider>;
}

export function usePartnerApps() {
  const ctx = useContext(PartnerAppsContext);
  if (!ctx) throw new Error("usePartnerApps must be used inside PartnerAppsProvider");
  return ctx;
}
