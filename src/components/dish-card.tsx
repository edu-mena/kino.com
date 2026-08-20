import { Link } from "@tanstack/react-router";
import { Heart, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { getRestaurant } from "@/data/helpers";
import type { MenuItem } from "@/data/types";
import { useCart } from "@/lib/cart";
import { formatKz } from "@/lib/format";
import { usePreferences } from "@/lib/preferences";

export function DishCard({ item }: { item: MenuItem }) {
  const { add } = useCart();
  const { isFavoriteRestaurant, toggleFavoriteRestaurant } = usePreferences();
  const restaurant = getRestaurant(item.restaurantId);
  const liked = isFavoriteRestaurant(item.restaurantId);

  return (
    <div className="card-soft group relative flex flex-col overflow-hidden">
      <button
        type="button"
        aria-label="Guardar restaurante nos favoritos"
        onClick={() => toggleFavoriteRestaurant(item.restaurantId)}
        className="absolute left-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:text-brand"
      >
        <Heart className={`h-4 w-4 ${liked ? "fill-brand text-brand" : ""}`} />
      </button>

      <Link
        to="/prato/$dishId"
        params={{ dishId: item.id }}
        className="block h-28 w-full bg-surface sm:h-32"
      >
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          width={768}
          height={768}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <div className="min-w-0">
          <Link
            to="/prato/$dishId"
            params={{ dishId: item.id }}
            className="block truncate font-display text-sm font-bold text-foreground"
          >
            {item.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{restaurant?.name}</p>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-primary">{formatKz(item.price)}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {restaurant?.rating ?? "—"}
              <Star className="h-3 w-3 fill-star text-star" />
            </p>
          </div>
          <button
            type="button"
            aria-label={`Adicionar ${item.name} ao carrinho`}
            onClick={() => {
              add(item.id, 1, []);
              toast.success(`${item.name} adicionado ao carrinho`);
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
