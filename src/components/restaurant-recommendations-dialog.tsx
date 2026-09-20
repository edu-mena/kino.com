import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { FulfillmentType, Restaurant } from "@/data/types";
import { useTranslation } from "@/i18n";
import { getRecommendedRestaurants } from "@/lib/recommend-restaurants";
import { useSubscriptions } from "@/lib/subscriptions";

/**
 * Popup de alternativas — aberto sempre que um restaurante não dá para usar
 * agora (pausado, fechado, fora do modo pedido). Mesmo conteúdo é reutilizado
 * pela notificação de pedido recusado (`NotificationList`), para as duas
 * superfícies ("popups e também nas notificações") nunca divergirem.
 */
export function RestaurantRecommendationsDialog({
  open,
  onOpenChange,
  restaurant,
  mode,
  reasonText,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** O restaurante indisponível — a cozinha dele ordena as sugestões. */
  restaurant: Restaurant;
  /** Só sugere quem serve este modo (ex: entrega) — se ausente, sugere
   * quem estiver disponível, seja qual for o modo. */
  mode?: FulfillmentType;
  /** Motivo já traduzido (ex: "Pausado", "Fechado agora — abre às 18:00"). */
  reasonText: string;
}) {
  const { t, locale } = useTranslation();
  const { byRestaurant } = useSubscriptions();

  const recommended = useMemo(
    () =>
      getRecommendedRestaurants({
        excludeId: restaurant.id,
        cuisine: restaurant.cuisine,
        mode,
        subStatusOf: (id) => byRestaurant(id)?.status,
        locale,
        limit: 3,
      }),
    [restaurant.id, restaurant.cuisine, mode, byRestaurant, locale],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
        <DialogTitle className="font-display text-lg font-bold">
          {t("restaurantRecommendations.title", { name: restaurant.name })}
        </DialogTitle>
        <p className="mt-1 text-sm text-muted-foreground">{reasonText}</p>

        {recommended.length > 0 ? (
          <>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("restaurantRecommendations.suggestionsTitle")}
            </p>
            <div className="mt-2 space-y-2">
              {recommended.map((r) => (
                <Link
                  key={r.id}
                  to="/restaurantes/$id"
                  params={{ id: r.id }}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary"
                >
                  <img
                    src={r.coverImage}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{r.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.cuisine} · {r.priceLevel}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-foreground">
                    <Star className="h-3.5 w-3.5 fill-star text-star" />
                    {r.rating}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              to="/restaurantes"
              onClick={() => onOpenChange(false)}
              className="mt-3 block text-center text-xs font-semibold text-primary hover:underline"
            >
              {t("restaurantRecommendations.seeAll")}
            </Link>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            {t("restaurantRecommendations.empty")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
