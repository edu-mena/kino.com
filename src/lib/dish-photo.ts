import placeholder from "@/assets/dish-placeholder.svg";
import type { MenuItem } from "@/data/types";

/** Ícone de prato para quem ainda não tem foto — antes era uma foto
 * genérica de comida, que parecia ser o prato real. */
export const DISH_PLACEHOLDER: string = placeholder;

/** Peso de "tem foto do próprio prato" nas ordenações — fotos reais vendem
 * melhor e mostram ao cliente o que vai receber. Na escala dos scores da
 * home/cardápio (popularidade ~log2(pedidos)*6, preferências até ~10). */
export const REAL_PHOTO_SCORE = 6;

/** `hasPhoto` só vem da API; os pratos de demonstração (mock) têm todos foto. */
export function hasRealPhoto(item: Pick<MenuItem, "hasPhoto" | "image">): boolean {
  return item.hasPhoto !== false && !!item.image && item.image !== DISH_PLACEHOLDER;
}

/** Mesma ordem, mas os pratos com foto primeiro (ordenação estável). */
export function photosFirst<T extends Pick<MenuItem, "hasPhoto" | "image">>(items: T[]): T[] {
  const withPhoto: T[] = [];
  const without: T[] = [];
  for (const item of items) (hasRealPhoto(item) ? withPhoto : without).push(item);
  return [...withPhoto, ...without];
}
