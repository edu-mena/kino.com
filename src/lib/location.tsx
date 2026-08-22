import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { INITIAL_SAVED_ADDRESSES } from "@/data/mockData";
import type { SavedAddress } from "@/data/types";
import { useAddresses } from "./addresses";

/**
 * Localização selecionada no chip do header (`LocationSelect`) — vive num
 * contexto partilhado (não só estado local do header) porque outros fluxos
 * (ex: confirmar entrega ao pedir delivery) precisam de ler/mudar a mesma
 * seleção.
 */
type LocationValue = {
  allAddresses: SavedAddress[];
  selectedId: string | null;
  selected: SavedAddress | undefined;
  setSelectedId: (id: string) => void;
};

const LocationContext = createContext<LocationValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { customAddresses } = useAddresses();
  const allAddresses = useMemo(
    () => [...INITIAL_SAVED_ADDRESSES, ...customAddresses],
    [customAddresses],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    INITIAL_SAVED_ADDRESSES.find((a) => a.isDefault)?.id ?? INITIAL_SAVED_ADDRESSES[0]?.id ?? null,
  );

  const value: LocationValue = {
    allAddresses,
    selectedId,
    selected: allAddresses.find((a) => a.id === selectedId),
    setSelectedId,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used inside LocationProvider");
  return ctx;
}
