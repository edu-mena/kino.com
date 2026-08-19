import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";
import { getMenuItem } from "@/data/helpers";
import { lineUnitPrice, useCart } from "@/lib/cart";
import { formatKz } from "@/lib/format";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Meu carrinho — Kino.com" },
      {
        name: "description",
        content: "Reveja os itens do seu pedido, ajuste quantidades e avance para o pagamento.",
      },
      { property: "og:title", content: "Meu carrinho — Kino.com" },
      { property: "og:description", content: "Reveja o seu pedido antes de pagar." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Carrinho,
});

function Carrinho() {
  const { lines, setQty, remove, subtotal, deliveryFee, total } = useCart();

  return (
    <PageShell>
      <PageHeading eyebrow="Carrinho" title="Resumo do pedido" />

      <div className="mx-auto mt-8 grid max-w-6xl gap-6 px-4 md:px-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          {lines.length === 0 && (
            <div className="card-soft grid place-items-center gap-3 p-12 text-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">O seu carrinho está vazio.</p>
              <Link
                to="/cardapio"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Ver cardápio
              </Link>
            </div>
          )}

          {lines.map((line) => {
            const item = getMenuItem(line.menuItemId);
            if (!item) return null;
            const unit = lineUnitPrice(line);
            const extrasOn = line.selectedIngredients.filter((s) => s.included);
            return (
              <div
                key={line.key}
                className="card-soft grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-4"
              >
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-surface">
                  <img src={item.image} alt={item.name} className="h-16 object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <h2 className="truncate font-display text-base font-bold">{item.name}</h2>
                    <button
                      type="button"
                      aria-label={`Remover ${item.name}`}
                      onClick={() => remove(line.key)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {extrasOn.length ? extrasOn.map((s) => s.name).join(", ") : item.portionInfo}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="font-bold text-primary">{formatKz(unit * line.qty)}</p>
                    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border p-1">
                      <button
                        type="button"
                        aria-label="Diminuir"
                        onClick={() => setQty(line.key, line.qty - 1)}
                        className="grid h-7 w-7 place-items-center rounded-md bg-surface"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{line.qty}</span>
                      <button
                        type="button"
                        aria-label="Aumentar"
                        onClick={() => setQty(line.key, line.qty + 1)}
                        className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="card-soft h-fit p-6">
          <h2 className="font-display text-lg font-bold text-primary">Totais</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">{formatKz(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Taxa de entrega</dt>
              <dd className="font-semibold">{formatKz(deliveryFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-extrabold text-primary">{formatKz(total)}</dd>
            </div>
          </dl>
          <Link
            to="/checkout"
            className="mt-6 block rounded-xl bg-brand px-5 py-3.5 text-center text-sm font-bold text-brand-foreground"
          >
            Finalizar pedido
          </Link>
          <Link
            to="/cardapio"
            className="mt-2 block rounded-xl border border-border px-5 py-3 text-center text-sm font-semibold"
          >
            Adicionar mais itens
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}
