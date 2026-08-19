import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Check, ChevronLeft, Clock, MapPin } from "lucide-react";
import { useState } from "react";
import icon from "@/assets/icon.png";
import { PageShell } from "@/components/site-shell";
import { getMenuItem } from "@/data/helpers";
import { INITIAL_SAVED_ADDRESSES } from "@/data/mockData";
import { lineUnitPrice, useCart } from "@/lib/cart";
import { formatKz } from "@/lib/format";
import { paymentMethods } from "@/lib/mock-data";
import { usePreferences } from "@/lib/preferences";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Pagamento e entrega — Kino.com" },
      {
        name: "description",
        content:
          "Escolha o endereço, o horário de entrega e o método de pagamento para concluir o seu pedido.",
      },
      { property: "og:title", content: "Pagamento e entrega — Kino.com" },
      { property: "og:description", content: "Conclua o seu pedido em poucos passos." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Checkout,
});

const slots = ["O mais rápido possível", "Hoje, 19:00 - 19:30", "Hoje, 20:00 - 20:30"];

function Checkout() {
  const navigate = useNavigate();
  const { lines, subtotal, deliveryFee, total, clear } = useCart();
  const { dietaryRestrictions } = usePreferences();
  const [address, setAddress] = useState(INITIAL_SAVED_ADDRESSES[0]!.id);
  const [slot, setSlot] = useState(slots[0]!);
  const [payment, setPayment] = useState(paymentMethods[0]!.id);

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
        <Link
          to="/carrinho"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar ao carrinho
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold text-primary sm:text-4xl">Finalizar pedido</h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            {dietaryRestrictions.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/5 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <p className="text-sm text-foreground">
                  <span className="font-bold">Avisaremos o restaurante:</span> o cliente tem
                  restrições — {dietaryRestrictions.join(", ")}.
                </p>
              </div>
            )}

            <section className="card-soft p-6">
              <h2 className="font-display text-lg font-bold text-primary">Endereço de entrega</h2>
              <div className="mt-4 space-y-2">
                {INITIAL_SAVED_ADDRESSES.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAddress(a.id)}
                    className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 text-left ${
                      address === a.id ? "border-brand bg-brand/5" : "border-border"
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{a.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {a.line1} · {a.line2}
                      </span>
                    </span>
                    {address === a.id && <Check className="h-4 w-4 shrink-0 text-brand" />}
                  </button>
                ))}
              </div>
            </section>

            <section className="card-soft p-6">
              <h2 className="font-display text-lg font-bold text-primary">Horário de entrega</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={`rounded-xl border p-3 text-left text-sm font-semibold ${
                      slot === s ? "border-brand bg-brand/5 text-primary" : "border-border"
                    }`}
                  >
                    <Clock className="mb-2 h-4 w-4 text-brand" />
                    {s}
                  </button>
                ))}
              </div>
            </section>

            <section className="card-soft p-6">
              <h2 className="font-display text-lg font-bold text-primary">Método de pagamento</h2>
              <div className="mt-4 space-y-2">
                {paymentMethods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayment(m.id)}
                    className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 text-left ${
                      payment === m.id ? "border-brand bg-brand/5" : "border-border"
                    }`}
                  >
                    <span className="grid h-9 w-14 shrink-0 place-items-center rounded-lg bg-surface text-[10px] font-bold text-primary">
                      {m.brand}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{m.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{m.detail}</span>
                    </span>
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        payment === m.id ? "border-brand bg-brand" : "border-border"
                      }`}
                    >
                      {payment === m.id && <Check className="h-3 w-3 text-brand-foreground" />}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="card-soft h-fit p-6">
            <h2 className="font-display text-lg font-bold text-primary">O seu pedido</h2>
            <ul className="mt-4 space-y-3">
              {lines.map((line) => {
                const item = getMenuItem(line.menuItemId);
                if (!item) return null;
                const unit = lineUnitPrice(line);
                return (
                  <li key={line.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground">
                      {line.qty}× {item.name}
                    </span>
                    <span className="shrink-0 font-semibold">{formatKz(unit * line.qty)}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-semibold">{formatKz(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Entrega</dt>
                <dd className="font-semibold">{formatKz(deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-extrabold text-primary">{formatKz(total)}</dd>
              </div>
            </dl>
            <button
              type="button"
              disabled={lines.length === 0}
              onClick={() => {
                clear();
                navigate({ to: "/pedido-confirmado" });
              }}
              className="mt-6 w-full rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-brand-foreground disabled:opacity-50"
            >
              Pagar {formatKz(total)}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Demonstração — nenhum pagamento real é processado.
            </p>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
