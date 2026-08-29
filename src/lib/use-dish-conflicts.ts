import { useMemo } from "react";
import type { MenuItem, MenuItemIngredient } from "@/data/types";
import { RESTRICTION_PACKAGES } from "@/lib/dietary-packages";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/i18n";

export type DishConflictGroup = { reason: string; ingredients: string[] };

/** Agrupa os ingredientes de um prato que conflitam com as preferências do
 * usuário pelo motivo (pacote de restrição, ex: "Vegetariano", ou a lista
 * livre `excludedIngredients`) — pura, sem hooks, pra poder ser chamada
 * também fora do corpo de um componente (ex: dentro de `.map()`/item
 * condicional, onde `useDishConflicts` não pode ser usado). */
export function computeDishConflicts(
  ingredients: MenuItemIngredient[],
  excludedIngredients: string[],
  dietaryRestrictions: string[],
  ownListReason: string,
): DishConflictGroup[] {
  const activePackages = RESTRICTION_PACKAGES.filter((p) => dietaryRestrictions.includes(p.label));

  const order: string[] = [];
  const byReason = new Map<string, string[]>();
  for (const ing of ingredients) {
    // Um ingrediente pode bater com mais de um pacote (ex: "Camarão" em
    // Vegetariano e em Sem marisco) — usa o primeiro, pra não repetir o
    // mesmo ingrediente em vários grupos do aviso.
    const matchingPackage = activePackages.find((p) => p.conflictIngredients.includes(ing.name));
    const reason = matchingPackage
      ? matchingPackage.label
      : excludedIngredients.includes(ing.name)
        ? ownListReason
        : null;
    if (!reason) continue;
    if (!byReason.has(reason)) {
      byReason.set(reason, []);
      order.push(reason);
    }
    byReason.get(reason)!.push(ing.name);
  }

  return order.map((reason) => ({ reason, ingredients: byReason.get(reason)! }));
}

/** Ingredientes deste prato que conflitam com as preferências do usuário,
 * agrupados pelo motivo — dá um aviso claro do tipo "Vegetariano: não
 * pode comer Frango Desfiado" em vez de só listar ingredientes soltos.
 * Base do aviso mostrado em `DishCard` e na página do prato. */
export function useDishConflicts(item: MenuItem): DishConflictGroup[] {
  const { t } = useTranslation();
  const { excludedIngredients, dietaryRestrictions } = usePreferences();

  return useMemo(
    () =>
      computeDishConflicts(
        item.ingredients,
        excludedIngredients,
        dietaryRestrictions,
        t("home.dishConflictOwnListReason"),
      ),
    [item.ingredients, excludedIngredients, dietaryRestrictions, t],
  );
}

/** "Vegetariano: não pode comer Frango Desfiado. Sem marisco: não pode
 * comer Camarão." — uma linha por grupo, prontas pra mostrar num banner
 * ou toast. */
export function formatDishConflicts(
  groups: DishConflictGroup[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  return groups
    .map((g) =>
      t("home.dishConflictTemplate", { reason: g.reason, ingredients: g.ingredients.join(", ") }),
    )
    .join(" ");
}
