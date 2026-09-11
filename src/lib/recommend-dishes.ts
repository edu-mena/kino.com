import type { MenuItem } from "@/data/types";
import { computeDishConflicts } from "@/lib/use-dish-conflicts";

/**
 * Reordena preservando a prioridade (score) o quanto possível, mas nunca
 * deixando dois itens seguidos com a mesma `key` — sempre que o próximo
 * melhor item bater com o anterior, "empresta" o melhor item seguinte que
 * já não bata. Só repete a mesma key seguida quando não sobra alternativa
 * (ex.: os últimos itens restantes são todos do mesmo restaurante).
 */
export function diversifyByKey<T>(itemsByScoreDesc: T[], keyOf: (item: T) => string): T[] {
  const remaining = [...itemsByScoreDesc];
  const result: T[] = [];
  let lastKey: string | null = null;
  while (remaining.length > 0) {
    let index = remaining.findIndex((item) => keyOf(item) !== lastKey);
    if (index === -1) index = 0; // só sobra a mesma key — força mesmo assim.
    const [picked] = remaining.splice(index, 1);
    result.push(picked!);
    lastKey = keyOf(picked!);
  }
  return result;
}

type RecommendInput = {
  items: MenuItem[];
  getCuisine: (restaurantId: string) => string | undefined;
  distanceKmOf: (restaurantId: string) => number;
  cuisinePreferences: string[];
  excludedIngredients: string[];
  dietaryRestrictions: string[];
  ownListReason: string;
  limit?: number;
};

/** Pontuação de "quão bem esta escolha serve o usuário agora": mais perto
 * do restaurante, cozinha das preferências dele, e sem conflito com
 * restrições alimentares pesam a favor; pratos com ingrediente proibido não
 * somem da lista (o card já mostra o aviso), só afundam pra não abrirem a
 * lista. Popularidade entra como desempate leve, não como critério
 * principal — isto é "recomendado pra si", não "mais pedidos". */
function scoreDish(item: MenuItem, input: RecommendInput): number {
  const conflicts = computeDishConflicts(
    item.ingredients,
    input.excludedIngredients,
    input.dietaryRestrictions,
    input.ownListReason,
  );
  const cuisine = input.getCuisine(item.restaurantId);
  const likesCuisine = !!cuisine && input.cuisinePreferences.includes(cuisine);
  const km = input.distanceKmOf(item.restaurantId);

  let score = 0;
  if (likesCuisine) score += 30;
  score += Math.max(0, 20 - km); // mais perto, mais pontos (satura aos 20km)
  score += Math.min(10, (item.orderCount ?? 0) / 5);
  if (item.isTrending) score += 3;
  if (conflicts.length > 0) score -= 100; // continua na lista, mas lá pro fim.
  return score;
}

/**
 * Lista de pratos "recomendados pra si" na ausência de filtros — baseada em
 * distância ao restaurante + preferências de cozinha/restrições, com o
 * cuidado de nunca enfileirar vários pratos seguidos do mesmo restaurante
 * (ver `diversifyByKey`), pra não parecer "vitrine de um restaurante só".
 */
export function buildRecommendedDishes(input: RecommendInput): MenuItem[] {
  const scored = input.items
    .map((item) => ({ item, score: scoreDish(item, input) }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);
  const diversified = diversifyByKey(scored, (item) => item.restaurantId);
  return input.limit ? diversified.slice(0, input.limit) : diversified;
}
