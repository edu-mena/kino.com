/**
 * Nível de preço de um restaurante — calculado a partir da média de preços
 * dos itens do cardápio (pratos e bebidas), nunca definido à mão. É
 * aplicado em `withOverrides` (`@/data/helpers`), por isso `getRestaurant`
 * e `getAllRestaurants` já o devolvem calculado.
 */

/** Rótulos por escalão, do mais barato ao mais caro. */
export const PRICE_TIER_LABELS = ["Kz", "Kz Kz", "Kz Kz Kz"] as const;

/** Limiares (Kz) sobre a média de preços do cardápio. Abaixo do 1.º →
 * escalão 1; entre os dois → escalão 2; acima do 2.º → escalão 3. */
const T1 = 4500;
const T2 = 8000;

/** Média de preços (Kz) → rótulo do escalão. Sem cardápio ainda, assume o
 * escalão médio para não marcar o restaurante como "económico" sem dados. */
export function priceLevelFromAverage(averageKz: number): string {
  if (!(averageKz > 0)) return PRICE_TIER_LABELS[1];
  if (averageKz < T1) return PRICE_TIER_LABELS[0];
  if (averageKz < T2) return PRICE_TIER_LABELS[1];
  return PRICE_TIER_LABELS[2];
}

/** Média dos preços de uma lista de itens de cardápio (0 se vazia). */
export function averageMenuPrice(items: { price: number }[]): number {
  if (items.length === 0) return 0;
  return items.reduce((sum, i) => sum + i.price, 0) / items.length;
}
