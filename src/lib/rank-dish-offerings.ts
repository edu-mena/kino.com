import type { MenuItem, Restaurant } from "@/data/types";
import type { DishConflictGroup } from "@/lib/use-dish-conflicts";

export type DishOffering = {
  item: MenuItem;
  restaurant: Restaurant;
  conflicts: DishConflictGroup[];
};

/** Ordena as ofertas do mesmo prato em restaurantes diferentes pelas
 * preferências do usuário — cozinha favorita e conflitos com restrições
 * alimentares primeiro, depois distância REAL (só com localização
 * autorizada — `distanceKmOf` devolve `undefined` sem ela, e aí não
 * conta), com preço como último desempate. Usada em `/pratos/$dishName`. */
export function rankDishOfferings(
  offerings: DishOffering[],
  cuisinePreferences: string[],
  distanceKmOf: (o: DishOffering) => number | undefined = () => undefined,
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
    const kmA = distanceKmOf(a) ?? Infinity;
    const kmB = distanceKmOf(b) ?? Infinity;
    if (kmA !== kmB) return kmA - kmB;
    return (a.item.price ?? 0) - (b.item.price ?? 0);
  });
}
