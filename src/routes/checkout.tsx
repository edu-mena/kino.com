import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Check, ChevronLeft, Clock, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { PageShell } from "@/components/site-shell";
import { getMenuItem, getRestaurant } from "@/data/helpers";
import { lineCustomizations, lineUnitPrice, useCart } from "@/lib/cart";
import { formatKz } from "@/lib/format";
import { paymentMethods } from "@/lib/mock-data";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Pagamento e entrega — Kino.com" },
      {
        name: "description",
        content:
          "Escolha o horário e o método de pagamento para concluir os seus pedidos de entrega.",
      },
      { property: "og:title", content: "Pagamento e entrega — Kino.com" },
      { property: "og:description", content: "Conclua os seus pedidos em poucos passos." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Checkout,
});

const slots = [
  { id: "fastest", time: null },
  { id: "today-1900", time: "19:00 - 19:30" },
  { id: "today-2000", time: "20:00 - 20:30" },
] as const;

function Checkout() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { orders, subtotal, deliveryFee, total, confirmOrder } = useCart();
  const hasItems = orders.length > 0;
  const { dietaryRestrictions, excludedIngredients } = usePreferences();
  const [slot, setSlot] = useState<(typeof slots)[number]["id"]>(slots[0].id);
  const [payment, setPayment] = useState(paymentMethods[0]!.id);
  // Pré-preenche com a observação já escrita ao pedir a entrega (se houver)
  // — o campo é editável nos dois momentos, não dois campos separados.
  const [note, setNote] = useState(() => orders.find((o) => o.note)?.note ?? "");
  const slotLabel = (s: (typeof slots)[number]) =>
    s.time ? `${t("checkout.today")} ${s.time}` : t("checkout.slotFastest");

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
        <Link
          to="/entrega"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" /> {t("checkout.backToDelivery")}
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold text-primary sm:text-4xl">
          {t("checkout.title")}
        </h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            {dietaryRestrictions.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/5 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <p className="text-sm text-foreground">
                  <span className="font-bold">{t("checkout.warnPrefix")}</span>{" "}
                  {t("checkout.warnDietarySuffix", { list: dietaryRestrictions.join(", ") })}
                </p>
              </div>
            )}

            {excludedIngredients.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-foreground">
                  <span className="font-bold">{t("checkout.warnPrefix")}</span>{" "}
                  {t("checkout.warnExcludedSuffix", { list: excludedIngredients.join(", ") })}
                </p>
              </div>
            )}

            <section className="card-soft p-6">
              <h2 className="font-display text-lg font-bold text-primary">
                {t("checkout.addressesTitle")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("checkout.addressesDescription")}
              </p>
              <div className="mt-4 space-y-2">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border p-3"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-muted-foreground">
                        {getRestaurant(order.restaurantId)?.name ?? "Restaurante"}
                      </span>
                      <span className="block truncate text-sm font-bold">
                        {order.deliveryAddress.label} — {order.deliveryAddress.line1}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="card-soft p-6">
              <h2 className="font-display text-lg font-bold text-primary">
                {t("checkout.scheduleTitle")}
              </h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {slots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSlot(s.id)}
                    className={`rounded-xl border p-3 text-left text-sm font-semibold ${
                      slot === s.id ? "border-brand bg-brand/5 text-primary" : "border-border"
                    }`}
                  >
                    <Clock className="mb-2 h-4 w-4 text-brand" />
                    {slotLabel(s)}
                  </button>
                ))}
              </div>
            </section>

            <section className="card-soft p-6">
              <h2 className="font-display text-lg font-bold text-primary">
                {t("checkout.paymentTitle")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("checkout.paymentDescription")}
              </p>
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
                      <span className="block truncate text-xs text-muted-foreground">
                        {m.detail}
                      </span>
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

            <section className="card-soft p-6">
              <h2 className="font-display text-lg font-bold text-primary">
                {t("checkout.noteTitle")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("checkout.noteDescription")}</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("checkout.notePlaceholder")}
                rows={3}
                className="mt-4 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
            </section>
          </div>

          <aside className="card-soft h-fit p-6">
            <h2 className="font-display text-lg font-bold text-primary">
              {t("checkout.yourOrder")}
            </h2>
            <div className="mt-4 space-y-4">
              {orders.map((order, i) => (
                <div key={order.id}>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("checkout.order")} {i + 1} ·{" "}
                    {getRestaurant(order.restaurantId)?.name ?? "Restaurante"}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {order.lines.map((line) => {
                      const item = getMenuItem(line.menuItemId);
                      if (!item) return null;
                      const unit = lineUnitPrice(line);
                      const custom = lineCustomizations(
                        line,
                        t("checkout.customRemoved"),
                        t("checkout.customAdded"),
                      );
                      return (
                        <li
                          key={line.key}
                          className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-muted-foreground">
                              {line.qty}× {item.name}
                            </span>
                            {custom.length > 0 && (
                              <span className="block truncate text-xs text-muted-foreground/80">
                                {custom.join(" · ")}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 font-semibold">
                            {formatKz(unit * line.qty)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("checkout.subtotal")}</dt>
                <dd className="font-semibold">{formatKz(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("checkout.delivery")}</dt>
                <dd className="font-semibold">{formatKz(deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base">
                <dt className="font-bold">{t("checkout.total")}</dt>
                <dd className="font-extrabold text-primary">{formatKz(total)}</dd>
              </div>
            </dl>
            <button
              type="button"
              disabled={!hasItems}
              onClick={() => {
                // Os pedidos já existem (desde "Solicitar delivery") — aqui só
                // anexamos a preferência de pagamento a cada um. Nada é
                // limpo: continuam visíveis e acompanháveis em "Entrega".
                for (const order of orders) confirmOrder(order.id, payment, note);
                toast.success(t("checkout.orderConfirmedToast"));
                navigate({ to: "/entrega" });
              }}
              className="mt-6 w-full rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-brand-foreground disabled:opacity-50"
            >
              {t("checkout.placeOrder")} — {formatKz(total)}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {t("checkout.footerNote")}
            </p>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
