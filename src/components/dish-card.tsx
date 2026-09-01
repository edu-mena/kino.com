import { Link } from "@tanstack/react-router";
import { Heart, Plus, Star, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { LazyImage } from "@/components/lazy-image";
import { getRestaurant } from "@/data/helpers";
import type { MenuItem } from "@/data/types";
import { useAddToBill } from "@/lib/bill";
import { formatKz } from "@/lib/format";
import { useMenuAdmin } from "@/lib/menu-admin";
import { usePreferences } from "@/lib/preferences";
import { useRestaurantStatus } from "@/lib/restaurant-status";
import { formatDishConflicts, useDishConflicts } from "@/lib/use-dish-conflicts";
import { useTranslation } from "@/i18n";

export function DishCard({ item }: { item: MenuItem }) {
  const addToBill = useAddToBill();
  const { isFavoriteRestaurant, toggleFavoriteRestaurant } = usePreferences();
  const { isAvailable } = useMenuAdmin();
  const restaurantStatus = useRestaurantStatus(item.restaurantId);
  const { t } = useTranslation();
  const restaurant = getRestaurant(item.restaurantId);
  const liked = isFavoriteRestaurant(item.restaurantId);
  const available = item.isAvailable && isAvailable(item.id) && restaurantStatus.available;

  // Conflitos deste prato com as restrições/exclusões do usuário em
  // Preferências, agrupados por motivo — dispara o aviso vermelho no
  // canto da imagem, ex: "Vegetariano: não pode comer Frango Desfiado."
  const conflicts = useDishConflicts(item);
  const hasConflict = conflicts.length > 0;
  const conflictMessage = hasConflict ? formatDishConflicts(conflicts, t) : "";

  return (
    <div className="card-soft group relative flex flex-col overflow-hidden">
      <button
        type="button"
        aria-label={t("dishCard.saveFavorite")}
        onClick={() => toggleFavoriteRestaurant(item.restaurantId)}
        className="absolute left-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:text-brand"
      >
        <Heart className={`h-4 w-4 ${liked ? "fill-brand text-brand" : ""}`} />
      </button>

      {hasConflict && (
        <button
          type="button"
          aria-label={`${t("home.dishConflictLabel")}: ${conflictMessage}`}
          onClick={() => toast.error(conflictMessage)}
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-transform hover:scale-105"
        >
          <TriangleAlert className="h-4 w-4" />
        </button>
      )}

      <Link
        to="/prato/$dishId"
        params={{ dishId: item.id }}
        className="relative block h-28 w-full bg-surface sm:h-32"
      >
        <LazyImage
          src={item.image}
          alt={item.name}
          width={768}
          height={768}
          className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            available ? "" : "grayscale"
          }`}
        />
        {!available && (
          <span className="absolute inset-x-2 bottom-2 rounded-full bg-foreground/80 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-background">
            {t("cardapio.unavailable")}
          </span>
        )}
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
            disabled={!available}
            aria-label={t("dishCard.addAria", { name: item.name })}
            onClick={() => addToBill(item.restaurantId, item.id, item.name)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
