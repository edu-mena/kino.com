import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";
import { INITIAL_RESERVATIONS } from "@/data/mockData";
import { useReservations } from "@/lib/reservations";

export const Route = createFileRoute("/reservas")({
  head: () => ({
    meta: [
      { title: "Reservas — Kino.com" },
      { name: "description", content: "Acompanhe e agende as suas reservas de mesa." },
      { property: "og:title", content: "Reservas — Kino.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Reservas,
});

function Reservas() {
  const { customReservations } = useReservations();
  const reservations = [...customReservations, ...INITIAL_RESERVATIONS];

  return (
    <PageShell>
      <PageHeading
        eyebrow="Reservas"
        title="As suas mesas"
        description="Pedidos de reserva enviados aos restaurantes — a confirmação final, o horário definitivo e eventual caução ficam a cargo de cada restaurante."
      />
      <div className="mx-auto mt-8 max-w-6xl px-4 md:px-6">
        {reservations.length === 0 ? (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <CalendarCheck className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Ainda não tem reservas.</p>
            <Link
              to="/restaurantes"
              className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Reservar uma mesa
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map((r) => (
              <div
                key={r.id}
                className="card-soft grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4"
              >
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface">
                  <img
                    src={r.restaurantImage}
                    alt={r.restaurantName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-bold">{r.restaurantName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.date} · {r.time} · {r.peopleCount} pessoas
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    r.status === "Confirmada"
                      ? "bg-success/15 text-success"
                      : "bg-brand/15 text-brand"
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
        {reservations.length > 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Para reservar noutro restaurante, procure-o em{" "}
            <Link to="/restaurantes" className="font-semibold text-primary hover:underline">
              Restaurantes
            </Link>{" "}
            e escolha "Reservar mesa".
          </p>
        )}
      </div>
    </PageShell>
  );
}
