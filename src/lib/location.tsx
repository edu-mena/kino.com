import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { INITIAL_SAVED_ADDRESSES } from "@/data/mockData";
import type { SavedAddress } from "@/data/types";
import { useAddresses } from "./addresses";

/** Estado do pedido de geolocalização exata do dispositivo (GPS/Wi-Fi via
 * `navigator.geolocation`) — separado da morada guardada escolhida no chip
 * do header, que é sempre aproximada (não vem do dispositivo). */
export type DeviceLocationStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";

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
  /** `[lat, lng]` do dispositivo, só depois de `requestDeviceLocation()` ser
   * chamado e o usuário autorizar — mais preciso que a morada guardada
   * (que é só uma referência de bairro/província), por isso tem prioridade
   * quando presente (ex.: ordenar restaurantes por proximidade real). */
  deviceCoords: [number, number] | null;
  deviceLocationStatus: DeviceLocationStatus;
  requestDeviceLocation: () => void;
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
  const [deviceCoords, setDeviceCoords] = useState<[number, number] | null>(null);
  const [deviceLocationStatus, setDeviceLocationStatus] = useState<DeviceLocationStatus>("idle");

  const requestDeviceLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setDeviceLocationStatus("unsupported");
      return;
    }
    setDeviceLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceCoords([pos.coords.latitude, pos.coords.longitude]);
        setDeviceLocationStatus("granted");
      },
      () => setDeviceLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  };

  const value: LocationValue = {
    allAddresses,
    selectedId,
    selected: allAddresses.find((a) => a.id === selectedId),
    setSelectedId,
    deviceCoords,
    deviceLocationStatus,
    requestDeviceLocation,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used inside LocationProvider");
  return ctx;
}
