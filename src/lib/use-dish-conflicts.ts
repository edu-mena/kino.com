import { useMemo } from "react";
import type { MenuItem } from "@/data/types";
import { getPackageConflictIngredients } from "@/lib/dietary-packages";
import { usePreferences } from "@/lib/preferences";

/** Ingredientes deste prato que conflitam com as preferências do usuário —
 * tanto a lista livre (`excludedIngredients`) quanto os pacotes de
 * restrição activos (`dietaryRestrictions`, ex: "Vegetariano"). Base do
 * aviso vermelho mostrado em `DishCard`, `DishRecommendationRow` e na
 * página do prato. */
export function useDishConflicts(item: MenuItem): string[] {
  const { excludedIngredients, dietaryRestrictions } = usePreferences();

  return useMemo(() => {
    const packageConflicts = getPackageConflictIngredients(dietaryRestrictions);
    const all = new Set([...excludedIngredients, ...packageConflicts]);
    return item.ingredients.filter((i) => all.has(i.name)).map((i) => i.name);
  }, [item.ingredients, excludedIngredients, dietaryRestrictions]);
}
