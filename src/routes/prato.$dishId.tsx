import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft, Minus, Plus, Salad, Star, TriangleAlert } from "lucide-react";
import { useState } from "react";
import icon from "@/assets/icon.png";
import { DishCard } from "@/components/dish-card";
import { PageShell } from "@/components/site-shell";
import { getMenuItem, getRestaurant, getRestaurantsOfferingDish } from "@/data/helpers";
import type { SelectedIngredient } from "@/data/types";
import { useMenuItems } from "@/data/use-menu-items";
import { useAddToBill } from "@/lib/bill";
import { formatKz } from "@/lib/format";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/prato/$dishId")({
  loader: ({ params }) => {
    const item = getMenuItem(params.dishId);
    if (!item) throw notFound();
    return { item };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Prato indisponível — Kino.com" }, { name: "robots", content: "noindex" }],
      };
    }
    const { item } = loaderData;
    const restaurantName = getRestaurant(item.restaurantId)?.name ?? "Kino.com";
    return {
      meta: [
        { title: `${item.name} — ${restaurantName} | Kino.com` },
        { name: "description", content: item.description },
        { property: "og:title", content: `${item.name} — ${restaurantName}` },
        { property: "og:description", content: item.description },
        { property: "og:image", content: item.image },
      ],
    };
  },
  component: DishDetail,
});

function DishDetail() {
  const { item } = Route.useLoaderData();
  const addToBill = useAddToBill();
  const { t } = useTranslation();
  const { excludedIngredients, dietaryRestrictions } = usePreferences();
  const [qty, setQty] = useState(1);

  const conflicts = item.ingredients
    .filter((i) => excludedIngredients.includes(i.name))
    .map((i) => i.name);
  const hasAnyRestriction = excludedIngredients.length > 0 || dietaryRestrictions.length > 0;

  const removableFree = item.ingredients.filter((i) => i.removable && !i.extraPrice);
  const extras = item.ingredients.filter((i) => i.extraPrice);

  const [selected, setSelected] = useState<SelectedIngredient[]>(() => [
    ...removableFree.map((i) => ({ id: i.id, name: i.name, included: true })),
    ...extras.map((i) => ({ id: i.id, name: i.name, included: false })),
  ]);

  const toggle = (id: string) =>
    setSelected((prev) => prev.map((s) => (s.id === id ? { ...s, included: !s.included } : s)));

  const extraTotal = extras.reduce((sum, i) => {
    const isOn = selected.find((s) => s.id === i.id)?.included;
    return isOn ? sum + (i.extraPrice ?? 0) : sum;
  }, 0);
  const unit = item.price + extraTotal;

  const otherRestaurants = getRestaurantsOfferingDish(item.name, item.restaurantId);
  const menuItems = useMenuItems();
  const related = menuItems.filter((m) => m.id !== item.id).slice(0, 4);

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
              src={item.image}
              alt={item.name}
              width={768}
              height={768}
              className="mx-auto block h-64 w-full max-w-sm object-contain sm:h-80"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-brand">
              {getRestaurant(item.restaurantId)?.name}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-primary sm:text-4xl">{item.name}</h1>
            <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <Star className="h-4 w-4 fill-star text-star" />
                {getRestaurant(item.restaurantId)?.rating ?? "—"}
              </span>
              <span>{item.prepTimeMinutes} min de preparo</span>
              <span>{item.portionInfo}</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.description}</p>

            {conflicts.length > 0 ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span>{t("home.dishConflictWarning", { list: conflicts.join(", ") })}</span>
              </div>
            ) : (
              !hasAnyRestriction && (
                <Link
                  to="/preferencias"
                  className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border p-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-brand hover:text-brand"
                >
                  <Salad className="h-4 w-4 shrink-0" />
                  {t("search.dietaryCta")}
                </Link>
              )
            )}

            {removableFree.length > 0 && (
              <div className="mt-7">
                <h2 className="font-display text-lg font-bold text-primary">Ingredientes</h2>
                <p className="text-xs text-muted-foreground">Desmarque o que não quiser.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {removableFree.map((ing) => {
                    const on = selected.find((s) => s.id === ing.id)?.included ?? true;
                    return (
                      <button
                        key={ing.id}
                        type="button"
                        onClick={() => toggle(ing.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          on
                            ? "border-brand bg-brand/5 text-foreground"
                            : "border-border bg-card text-muted-foreground line-through"
                        }`}
                      >
                        {ing.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {extras.length > 0 && (
              <div className="mt-7">
                <h2 className="font-display text-lg font-bold text-primary">Adicionais</h2>
                <div className="mt-3 space-y-2">
                  {extras.map((extra) => {
                    const on = selected.find((s) => s.id === extra.id)?.included ?? false;
                    return (
                      <button
                        key={extra.id}
                        type="button"
                        onClick={() => toggle(extra.id)}
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
                        <span className="min-w-0 truncate text-sm font-medium">{extra.name}</span>
                        <span className="shrink-0 text-sm font-semibold text-primary">
                          +{formatKz(extra.extraPrice ?? 0)}
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
                  for (let i = 0; i < qty; i++) addToBill(item.restaurantId, item.id, item.name);
                }}
                className="min-w-0 truncate rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-brand-foreground transition-opacity hover:opacity-90"
              >
                Adicionar ao pedido · {formatKz(unit * qty)}
              </button>
            </div>

            {otherRestaurants.length > 0 && (
              <div className="mt-8 rounded-xl border border-border bg-surface p-4">
                <p className="text-xs font-semibold text-muted-foreground">Também disponível em:</p>
                <div className="mt-2 space-y-2">
                  {otherRestaurants.map((r) => (
                    <Link
                      key={r.id}
                      to="/cardapio"
                      search={{ restaurante: r.id }}
                      className="flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
                    >
                      {r.name} <span className="text-muted-foreground">— ver aqui</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <h2 className="mt-16 text-2xl font-extrabold text-primary">Também vai gostar</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {related.map((m) => (
            <DishCard key={m.id} item={m} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
