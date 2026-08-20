import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getCommonIngredients, getRestaurant, getRestaurantsOfferingDish } from "@/data/helpers";
import type { MenuItem } from "@/data/types";
import { useCart } from "@/lib/cart";
import { formatKz } from "@/lib/format";

/**
 * Linha horizontal reutilizável de pratos recomendados. Usada para
 * "Recomendações pra você", Fast-food, Grelhados, Em Alta, etc. — só muda a
 * lista de `items` recebida.
 */
export function DishRecommendationRow({ items }: { items: MenuItem[] }) {
  const [active, setActive] = useState<MenuItem | null>(null);
  const { add } = useCart();

  const commonIngredients = active ? getCommonIngredients(active.name) : [];
  const otherRestaurants = active
    ? getRestaurantsOfferingDish(active.name, active.restaurantId)
    : [];

  return (
    <>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
        {items.map((item) => {
          const restaurant = getRestaurant(item.restaurantId);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item)}
              className="card-soft flex w-40 shrink-0 flex-col overflow-hidden text-left transition-colors hover:border-brand"
            >
              <div className="h-24 w-full bg-surface">
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-3">
                <p className="truncate font-display text-sm font-bold text-foreground">
                  {item.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{restaurant?.name}</p>
                <p className="mt-2 text-sm font-bold text-primary">{formatKz(item.price)}</p>
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-md rounded-[2rem] border-none bg-card p-8">
          {active && (
            <>
              <div className="rounded-2xl bg-surface p-4">
                <img
                  src={active.image}
                  alt={active.name}
                  className="mx-auto h-40 object-contain"
                />
              </div>
              <DialogTitle className="mt-4 font-display text-xl font-bold">
                {active.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {getRestaurant(active.restaurantId)?.name}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{active.description}</p>
              <p className="mt-3 text-lg font-bold text-primary">{formatKz(active.price)}</p>

              {commonIngredients.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Ingredientes comuns entre restaurantes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {commonIngredients.map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-surface px-3 py-1 text-xs text-foreground"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {otherRestaurants.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Também disponível em
                  </p>
                  <div className="mt-2 space-y-2">
                    {otherRestaurants.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 rounded-xl border border-border p-2"
                      >
                        <img
                          src={r.coverImage}
                          alt={r.name}
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {r.name}
                        </span>
                        <Link
                          to="/cardapio"
                          search={{ restaurante: r.id }}
                          onClick={() => setActive(null)}
                          className="shrink-0 text-xs font-bold text-brand"
                        >
                          ver aqui
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <Link
                  to="/prato/$dishId"
                  params={{ dishId: active.id }}
                  onClick={() => setActive(null)}
                  className="flex-1 rounded-xl border border-border px-5 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:border-primary"
                >
                  Ver prato
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    add(active.id, 1, []);
                    toast.success(`${active.name} adicionado ao carrinho`);
                    setActive(null);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
