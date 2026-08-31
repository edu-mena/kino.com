import type { MenuItem, Restaurant } from "@/data/types";
import type { DishConflictGroup } from "@/lib/use-dish-conflicts";

export type DishOffering = {
  item: MenuItem;
  restaurant: Restaurant;
  conflicts: DishConflictGroup[];
};

/** Ordena as ofertas do mesmo prato em restaurantes diferentes pelas
 * preferências do usuário — cozinha favorita e conflitos com restrições
 * alimentares primeiro, depois distância, com preço como último
 * desempate. Usada em `/pratos/$dishName` (visão geral de um prato). */
export function rankDishOfferings(
  offerings: DishOffering[],
  cuisinePreferences: string[],
): DishOffering[] {
  const score = (o: DishOffering) => {
    let s = 0;
    if (cuisinePreferences.includes(o.restaurant.cuisine)) s += 2;
    if (o.conflicts.length > 0) s -= 3;
    return s;
  };

  return [...offerings].sort((a, b) => {
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    if (a.restaurant.distanceKm !== b.restaurant.distanceKm) {
      return a.restaurant.distanceKm - b.restaurant.distanceKm;
    }
    return a.item.price - b.item.price;
  });
}
