import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import icon from "@/assets/icon.png";
import { PageShell } from "@/components/site-shell";

export const Route = createFileRoute("/pedido-confirmado")({
  head: () => ({
    meta: [
      { title: "Pedido confirmado — Kino.com" },
      {
        name: "description",
        content: "O seu pedido foi confirmado e já está a ser preparado pelo restaurante.",
      },
      { property: "og:title", content: "Pedido confirmado — Kino.com" },
      { property: "og:description", content: "O seu pedido já está a ser preparado." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Confirmado,
});

function Confirmado() {
  return (
    <PageShell>
      <div className="mx-auto grid max-w-xl place-items-center px-4 py-20 text-center md:px-6">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-10 w-10" />
        </span>
        <h1 className="mt-6 text-3xl font-extrabold text-primary">Pedido confirmado!</h1>
        <p className="mt-3 text-muted-foreground">
          Pedido <span className="font-semibold text-foreground">#KN-48201</span> recebido. O
          restaurante já começou a preparar e a entrega chega em cerca de 30 minutos.
        </p>
        <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
          <Link
            to="/acompanhar"
            className="rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-brand-foreground"
          >
            Acompanhar pedido
          </Link>
          <Link
            to="/cardapio"
            className="rounded-xl border border-border px-5 py-3.5 text-sm font-semibold"
          >
            Continuar a pedir
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
