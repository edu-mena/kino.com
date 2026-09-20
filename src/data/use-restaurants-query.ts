import { useQuery } from "@tanstack/react-query";
import { fetchApiMenuItems, fetchApiRestaurant, fetchApiRestaurants } from "./api-restaurants";
import { getAllRestaurants, getMenuItemsByRestaurant, getRestaurant } from "./helpers";
import type { MenuItem, Restaurant } from "./types";
import { hasRealBackend } from "@/lib/api-client";

/**
 * Ponto único de leitura de restaurantes/menu para os 3 primeiros ecrãs
 * ligados à API real (listagem, detalhe, cardápio — ver conversa sobre
 * teste em rede local). Sem backend configurado (`hasRealBackend` false,
 * demo em *.vercel.app), cai direto no mock síncrono de sempre — nada muda
 * aí, é só embrulhado numa Promise já resolvida para o formato do hook
 * ficar igual nos dois casos.
 *
 * `staleTime: 30s` — dados mudam pouco (restaurantes/menu, não pedidos em
 * tempo real) e isto é só para navegar; evita re-perguntar à API a cada
 * troca de aba/filtro.
 */

export function useRestaurants() {
  return useQuery({
    queryKey: ["restaurants"],
    queryFn: () => (hasRealBackend ? fetchApiRestaurants() : Promise.resolve(getAllRestaurants())),
    staleTime: 30_000,
  });
}

export function useRestaurantDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["restaurant", id],
    queryFn: (): Promise<Restaurant | undefined> =>
      hasRealBackend ? fetchApiRestaurant(id!) : Promise.resolve(getRestaurant(id!)),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useRestaurantMenuItems(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["restaurant-menu-items", restaurantId],
    queryFn: (): Promise<MenuItem[]> =>
      hasRealBackend
        ? fetchApiMenuItems(restaurantId!)
        : Promise.resolve(getMenuItemsByRestaurant(restaurantId!)),
    enabled: !!restaurantId,
    staleTime: 30_000,
  });
}
