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
  /** Pratos/bebidas favoritos — a composição deles (ingredientes e
   * categoria) puxa para cima itens parecidos. */
  favoriteItemIds?: string[];
  /** Ingredientes marcados como favoritos em Preferências. */
  favoriteIngredients?: string[];
  /** Onde procurar os favoritos para o perfil — por omissão `items`; quem
   * passa uma lista já filtrada (pesquisa/categoria) dá aqui a completa,
   * para um favorito fora do filtro continuar a contar. */
  profileItems?: MenuItem[];
  limit?: number;
};

/** Perfil de gosto tirado dos favoritos: quantas vezes cada ingrediente e
 * cada categoria aparecem nos pratos/bebidas favoritos, mais os
 * ingredientes favoritos explícitos (peso extra — foi o cliente que disse). */
export type TasteProfile = {
  ingredients: Map<string, number>;
  categories: Map<string, number>;
  favoriteIds: Set<string>;
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export function buildTasteProfile(
  items: MenuItem[],
  favoriteItemIds: string[] = [],
  favoriteIngredients: string[] = [],
): TasteProfile {
  const favoriteIds = new Set(favoriteItemIds);
  const ingredients = new Map<string, number>();
  const categories = new Map<string, number>();
  for (const item of items) {
    if (!favoriteIds.has(item.id)) continue;
    for (const ing of item.ingredients) {
      const key = norm(ing.name);
      if (key) ingredients.set(key, (ingredients.get(key) ?? 0) + 1);
    }
    const cat = norm(item.category);
    if (cat) categories.set(cat, (categories.get(cat) ?? 0) + 1);
  }
  for (const name of favoriteIngredients) {
    const key = norm(name);
    if (key) ingredients.set(key, (ingredients.get(key) ?? 0) + 2);
  }
  return { ingredients, categories, favoriteIds };
}

/** Pontos de afinidade com o perfil (0 sem favoritos): ingredientes em
 * comum pesam mais do que a categoria; o próprio favorito leva um bónus
 * pequeno (aparece, mas não enche a lista sozinho). Satura para nunca
 * ultrapassar a distância/cozinha como critério. */
export function tasteAffinity(item: MenuItem, profile: TasteProfile): number {
  if (profile.ingredients.size === 0 && profile.categories.size === 0) return 0;
  let ingredientHits = 0;
  for (const ing of item.ingredients) {
    ingredientHits += profile.ingredients.get(norm(ing.name)) ?? 0;
  }
  let score = Math.min(25, ingredientHits * 5);
  score += Math.min(10, (profile.categories.get(norm(item.category)) ?? 0) * 5);
  if (profile.favoriteIds.has(item.id)) score += 5;
  return score;
}

/** Pontuação de "quão bem esta escolha serve o usuário agora": mais perto
 * do restaurante, cozinha das preferências dele, e sem conflito com
 * restrições alimentares pesam a favor; pratos com ingrediente proibido não
 * somem da lista (o card já mostra o aviso), só afundam pra não abrirem a
 * lista. Popularidade entra como desempate leve, não como critério
 * principal — isto é "recomendado pra si", não "mais pedidos". */
function scoreDish(item: MenuItem, input: RecommendInput, profile: TasteProfile): number {
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
  score += tasteAffinity(item, profile);
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
  const profile = buildTasteProfile(
    input.profileItems ?? input.items,
    input.favoriteItemIds,
    input.favoriteIngredients,
  );
  const scored = input.items
    .map((item) => ({ item, score: scoreDish(item, input, profile) }))
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);
  const diversified = diversifyByKey(scored, (item) => item.restaurantId);
  return input.limit ? diversified.slice(0, input.limit) : diversified;
}
