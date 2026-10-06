import { useRestaurants } from "@/data/use-restaurants-query";
import { hasRealBackend } from "@/lib/api-client";

/**
 * Carrega a lista de restaurantes reais assim que a app abre, em qualquer
 * página — é ela que enche o catálogo (`@/data/live-catalog`) de onde os
 * helpers síncronos (`getRestaurant`, cozinhas, pesquisa...) leem nome,
 * zona e cozinha de cada restaurante. Sem isto, uma página que só mostrasse
 * pratos ficava sem o nome do restaurante até alguém pedir a lista.
 * Partilha a cache do React Query com `useRestaurants()` (um só pedido).
 */
function RealCatalogLoader() {
  useRestaurants();
  return null;
}

export function LiveCatalogLoader() {
  return hasRealBackend ? <RealCatalogLoader /> : null;
}
