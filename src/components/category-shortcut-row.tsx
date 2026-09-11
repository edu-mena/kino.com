import { Link } from "@tanstack/react-router";
import {
  Beef,
  ChefHat,
  Coffee,
  Cookie,
  Fish,
  GlassWater,
  IceCreamBowl,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { HorizontalCarousel } from "@/components/horizontal-carousel";
import type { MenuItem } from "@/data/types";
import { translateMenuCategory, useTranslation } from "@/i18n";

/** Ícone por categoria de prato — só decorativo, sem correspondência
 * garantida em categorias criadas depois (painel do restaurante); essas
 * caem no ícone genérico (`UtensilsCrossed`). */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Fast-Food": Sandwich,
  Lanches: Sandwich,
  Snacks: Cookie,
  Grelhados: Beef,
  Pizza,
  Pizzas: Pizza,
  Massas: Utensils,
  Entradas: Soup,
  "Pratos Quentes": Soup,
  "Pratos Principais": UtensilsCrossed,
  "Pequeno-Almoço": Coffee,
  Sobremesas: IceCreamBowl,
  Bebidas: GlassWater,
  Acompanhamentos: Salad,
  Combinados: ChefHat,
  Temakis: Fish,
  Uramaki: Fish,
};

/**
 * Slide horizontal de categorias de pratos na home — atalho pra `/cardapio`
 * já com o filtro de categoria aplicado (`?categoria=`). Substitui o antigo
 * card "Tem alguma restrição alimentar?" (agora só em Preferências).
 */
export function CategoryShortcutRow({ items }: { items: MenuItem[] }) {
  const { locale } = useTranslation();

  const categories = useMemo(() => {
    const ids = [...new Set(items.map((m) => m.category))];
    return ids.map((id) => ({ id, label: translateMenuCategory(id, locale) }));
  }, [items, locale]);

  return (
    <HorizontalCarousel
      items={categories}
      itemKey={(cat) => cat.id}
      itemClassName="pl-2"
      contentClassName="-ml-2"
      showArrows={false}
      renderItem={(cat) => {
        const Icon = CATEGORY_ICONS[cat.id] ?? UtensilsCrossed;
        return (
          <Link
            to="/cardapio"
            search={{ categoria: cat.id }}
            className="card-soft flex w-fit shrink-0 flex-col items-center gap-2 px-5 py-4 text-center transition-colors hover:border-brand"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
              <Icon className="h-5 w-5" />
            </span>
            <p className="whitespace-nowrap text-xs font-semibold text-foreground">{cat.label}</p>
          </Link>
        );
      }}
    />
  );
}
