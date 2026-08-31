import { Link } from "@tanstack/react-router";
import { ChevronRight, Store } from "lucide-react";
import { LazyImage } from "@/components/lazy-image";
import type { DishGroup } from "@/lib/group-dishes-by-name";
import { formatKz } from "@/lib/format";

/** Card de resultado de pesquisa agrupado por nome de prato — mesmo
 * visual do `DishCard`, mas sem ações de restaurante específico (favorito,
 * adicionar ao pedido, disponibilidade), já que ainda não se escolheu em
 * qual restaurante pedir. Leva pra `/pratos/$dishName` (visão geral). */
export function DishGroupCard({ group }: { group: DishGroup }) {
  const firstItem = group.items[0]!;
  const prices = group.items.map((i) => i.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return (
    <Link
      to="/pratos/$dishName"
      params={{ dishName: group.name }}
      className="card-soft group flex flex-col overflow-hidden transition-colors hover:border-brand"
    >
      <div className="relative h-28 w-full bg-surface sm:h-32">
        <LazyImage
          src={firstItem.image}
          alt={group.name}
          width={768}
          height={768}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {group.items.length > 1 && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-bold text-foreground backdrop-blur">
            <Store className="h-3 w-3" />
            {group.items.length}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="truncate font-display text-sm font-bold text-foreground">{group.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {group.items.length > 1 ? `${group.items.length} restaurantes` : "1 restaurante"}
        </p>

        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="truncate text-sm font-bold text-primary">
            {minPrice === maxPrice ? formatKz(minPrice) : `Desde ${formatKz(minPrice)}`}
          </p>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-muted-foreground transition-colors group-hover:text-brand">
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
