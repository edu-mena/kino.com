import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { SavedAddress } from "@/data/types";

const STORAGE_KEY = "kino_custom_addresses";

type AddressesValue = {
  customAddresses: SavedAddress[];
  addAddress: (label: string, line1: string, line2?: string) => void;
};

const AddressesContext = createContext<AddressesValue | null>(null);

export function AddressesProvider({ children }: { children: ReactNode }) {
  const [customAddresses, setCustomAddresses] = useState<SavedAddress[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setCustomAddresses(JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const addAddress = (label: string, line1: string, line2?: string) => {
    const next: SavedAddress[] = [
      ...customAddresses,
      { id: `addr-custom-${Date.now()}`, label, line1, line2: line2 ?? "" },
    ];
    setCustomAddresses(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <AddressesContext.Provider value={{ customAddresses, addAddress }}>
      {children}
    </AddressesContext.Provider>
  );
}

export function useAddresses() {
  const ctx = useContext(AddressesContext);
  if (!ctx) throw new Error("useAddresses must be used inside AddressesProvider");
  return ctx;
}
