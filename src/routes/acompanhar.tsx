import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, Phone, MessageCircle } from "lucide-react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";
import { formatKz, getDish, trackingSteps } from "@/lib/mock-data";

export const Route = createFileRoute("/acompanhar")({
  head: () => ({
    meta: [
      { title: "Acompanhar pedido — Kino.com" },
      {
        name: "description",
        content: "Veja o estado do seu pedido em tempo real, do preparo até à entrega à sua porta.",
      },
      { property: "og:title", content: "Acompanhar pedido — Kino.com" },
      { property: "og:description", content: "Estado do pedido em tempo real." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Acompanhar,
});

const orderItems = [
  { id: "combo-classico", qty: 1 },
  { id: "batata-frita", qty: 2 },
  { id: "coca-cola", qty: 1 },
];

function Acompanhar() {
  const items = orderItems
    .map((i) => ({ dish: getDish(i.id), qty: i.qty }))
    .filter((i) => i.dish);
  const subtotal = items.reduce((s, i) => s + (i.dish?.price ?? 0) * i.qty, 0);

  return (
    <PageShell>
      <PageHeading eyebrow="Pedido #KN-48201" title="A caminho da sua porta" />

      <div className="mx-auto mt-8 grid max-w-6xl gap-6 px-4 md:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="card-soft grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
              <Bike className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold">Domingos Kiala</p>
              <p className="truncate text-xs text-muted-foreground">
                Estafeta · Mota vermelha · LD-42-19-AB
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface text-primary">
                <Phone className="h-4 w-4" />
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface text-primary">
                <MessageCircle className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="card-soft p-6">
            <h2 className="font-display text-lg font-bold text-primary">Estado da entrega</h2>
            <ol className="mt-5 space-y-1">
              {trackingSteps.map((step, i) => (
                <li key={step.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                        step.done ? "bg-success" : "border-2 border-border bg-card"
                      }`}
                    />
                    {i < trackingSteps.length - 1 && (
                      <span
                        className={`w-0.5 flex-1 ${step.done ? "bg-success" : "bg-border"}`}
                        style={{ minHeight: 44 }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 pb-6">
                    <p
                      className={`truncate text-sm font-bold ${
                        step.done ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{step.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{step.time}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <aside className="card-soft h-fit p-6">
          <h2 className="font-display text-lg font-bold text-primary">Detalhes do pedido</h2>
          <ul className="mt-4 space-y-3">
            {items.map(({ dish, qty }) => (
              <li key={dish!.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface">
                  <img src={dish!.image} alt={dish!.name} className="h-9 object-contain" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{dish!.name}</span>
                  <span className="block text-xs text-muted-foreground">Qtd. {qty}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold">
                  {formatKz(dish!.price * qty)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">{formatKz(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Entrega</dt>
              <dd className="font-semibold">{formatKz(700)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base">
              <dt className="font-bold">Total pago</dt>
              <dd className="font-extrabold text-primary">{formatKz(subtotal + 700)}</dd>
            </div>
          </dl>
          <Link
            to="/ajuda"
            className="mt-6 block rounded-xl border border-border px-5 py-3 text-center text-sm font-semibold"
          >
            Preciso de ajuda
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}