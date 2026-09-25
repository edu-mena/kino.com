import { useQuery } from "@tanstack/react-query";
import { fetchApiPackageTypeRestaurants, fetchApiPackageTypes } from "./api-package-types";
import { getEffectivePackageTypes } from "./package-types-store";
import { getRestaurantPackages, getRestaurantPackagesByType } from "./restaurant-packages-store";
import type { PackageType, RestaurantPackage } from "./types";
import { hasRealBackend } from "@/lib/api-client";

/**
 * Descoberta pública dos pacotes de consumo (Fase L3d) — mesmo padrão
 * `useQuery` de `@/data/use-restaurants-query`. Sem backend real, computa
 * a partir dos dois stores mock diretamente aqui (em vez de um deles
 * importar o outro) para não criar um import circular entre
 * `package-types-store` e `restaurant-packages-store` (cada um já importa
 * do outro para resolver nomes).
 */

/** Tipos de pacote ativos com pelo menos um restaurante a oferecer —
 * `/pacotes`. Um tipo sem nenhuma oferta ainda não aparece aqui (ver
 * `PackageTypeController::index`, `?with_offers=1`). */
export function usePackageTypesWithOffers() {
  return useQuery({
    queryKey: ["package-types-with-offers"],
    queryFn: (): Promise<PackageType[]> => {
      if (hasRealBackend) return fetchApiPackageTypes(undefined, true);
      const offeredIds = new Set(
        getRestaurantPackages()
          .filter((p) => p.isActive)
          .map((p) => p.packageType.id),
      );
      return Promise.resolve(
        getEffectivePackageTypes({ activeOnly: true }).filter((t) => offeredIds.has(t.id)),
      );
    },
    staleTime: 30_000,
  });
}

/** Restaurantes ativos que oferecem UM tipo de pacote, com resumo do
 * restaurante embutido para ordenar por distância — `/pacotes/$packageTypeId`. */
export function usePackageTypeRestaurants(packageTypeId: string | undefined) {
  return useQuery({
    queryKey: ["package-type-restaurants", packageTypeId],
    queryFn: (): Promise<RestaurantPackage[]> =>
      hasRealBackend
        ? fetchApiPackageTypeRestaurants(packageTypeId!)
        : Promise.resolve(getRestaurantPackagesByType(packageTypeId!)),
    enabled: !!packageTypeId,
    staleTime: 30_000,
  });
}
