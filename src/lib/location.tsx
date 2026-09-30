import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { INITIAL_SAVED_ADDRESSES } from "@/data/mockData";
import { hasRealBackend } from "@/lib/api-client";
import type { SavedAddress } from "@/data/types";
import { useAddresses } from "./addresses";
import { getDevicePosition } from "./native-permissions";

// Com backend real, um utilizador novo começa sem moradas guardadas — as
// 3 moradas de exemplo (Casa/Trabalho/Universidade) só fazem sentido sem
// backend (demo/dev). Função em vez de constante de módulo — calculada só
// quando o componente renderiza (SSR: todos os módulos já carregados
// nessa altura), evita um "SEED_SAVED_ADDRESSES is not iterable" em
// produção quando a ordem de avaliação de imports cíclicos faz este
// ficheiro correr antes de `mockData.ts` terminar de inicializar
// `INITIAL_SAVED_ADDRESSES`.
function seedSavedAddresses(): SavedAddress[] {
  return hasRealBackend ? [] : INITIAL_SAVED_ADDRESSES;
}

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
  const seedAddresses = seedSavedAddresses();
  const allAddresses = useMemo(
    () => [...seedAddresses, ...customAddresses],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customAddresses],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    seedAddresses.find((a) => a.isDefault)?.id ?? seedAddresses[0]?.id ?? null,
  );
  const [deviceCoords, setDeviceCoords] = useState<[number, number] | null>(null);
  const [deviceLocationStatus, setDeviceLocationStatus] = useState<DeviceLocationStatus>("idle");

  // Browser: `navigator.geolocation`. App nativa: pede a permissão ao SO e,
  // se já estava negada de vez, abre as definições da app (ver
  // `@/lib/native-permissions`). GPS desligado/timeout continua a mostrar-se
  // como "denied", como antes.
  const requestDeviceLocation = () => {
    setDeviceLocationStatus("loading");
    void getDevicePosition().then((result) => {
      if (result.ok) {
        setDeviceCoords(result.coords);
        setDeviceLocationStatus("granted");
      } else {
        setDeviceLocationStatus(result.reason === "unsupported" ? "unsupported" : "denied");
      }
    });
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
