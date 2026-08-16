import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Minus, Plus, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { DishCard } from "@/components/dish-card";
import { PageShell } from "@/components/site-shell";
import { useCart } from "@/lib/cart";
import { dishes, formatKz, getDish, type AddOn } from "@/lib/mock-data";

export const Route = createFileRoute("/prato/$dishId")({
  loader: ({ params }) => {
    const dish = getDish(params.dishId);
    if (!dish) throw notFound();
    return { dish };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Prato indisponível — Kino.com" }, { name: "robots", content: "noindex" }],
      };
    }
    const { dish } = loaderData;
    return {
      meta: [
        { title: `${dish.name} — ${dish.restaurant} | Kino.com` },
        { name: "description", content: dish.description },
        { property: "og:title", content: `${dish.name} — ${dish.restaurant}` },
        { property: "og:description", content: dish.description },
        { property: "og:image", content: dish.image },
      ],
    };
  },
  component: DishDetail,
});

function DishDetail() {
  const { dish } = Route.useLoaderData();
  const { add } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<AddOn[]>([]);

  const toggle = (addOn: AddOn) =>
    setSelected((prev) =>
      prev.some((a) => a.id === addOn.id)
        ? prev.filter((a) => a.id !== addOn.id)
        : [...prev, addOn],
    );

  const unit = dish.price + selected.reduce((s, a) => s + a.price, 0);
  const related = dishes.filter((d) => d.id !== dish.id).slice(0, 4);

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
        <Link
          to="/cardapio"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar ao cardápio
        </Link>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="grid place-items-center rounded-[2rem] bg-surface p-8">
            <img
              src={dish.image}
              alt={dish.name}
              width={768}
              height={768}
              className="h-64 w-full max-w-sm object-contain sm:h-80"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-brand">{dish.restaurant}</p>
            <h1 className="mt-1 text-3xl font-extrabold text-primary sm:text-4xl">{dish.name}</h1>
            <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <Star className="h-4 w-4 fill-star text-star" />
                {dish.rating}
              </span>
              <span>25 - 35 min</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{dish.description}</p>

            {dish.addOns.length > 0 && (
              <div className="mt-7">
                <h2 className="font-display text-lg font-bold text-primary">Adicionais</h2>
                <div className="mt-3 space-y-2">
                  {dish.addOns.map((addOn) => {
                    const on = selected.some((a) => a.id === addOn.id);
                    return (
                      <button
                        key={addOn.id}
                        type="button"
                        onClick={() => toggle(addOn)}
                        className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                          on ? "border-brand bg-brand/5" : "border-border bg-card"
                        }`}
                      >
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                            on ? "border-brand bg-brand text-brand-foreground" : "border-border"
                          }`}
                        >
                          {on && <Plus className="h-3 w-3 rotate-45" />}
                        </span>
                        <span className="min-w-0 truncate text-sm font-medium">{addOn.name}</span>
                        <span className="shrink-0 text-sm font-semibold text-primary">
                          +{formatKz(addOn.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
              <div className="flex shrink-0 items-center gap-3 rounded-xl border border-border bg-card p-2">
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-surface"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center font-bold">{qty}</span>
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  onClick={() => setQty((q) => q + 1)}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  add(dish.id, qty, selected);
                  toast.success("Adicionado ao carrinho");
                  navigate({ to: "/carrinho" });
                }}
                className="min-w-0 truncate rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-brand-foreground transition-opacity hover:opacity-90"
              >
                Adicionar · {formatKz(unit * qty)}
              </button>
            </div>
          </div>
        </div>

        <h2 className="mt-16 text-2xl font-extrabold text-primary">Também vai gostar</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {related.map((d) => (
            <DishCard key={d.id} dish={d} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}