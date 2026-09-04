import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, Star, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { EmptyState } from "@/components/empty-state";
import { ReviewDialog } from "@/components/review-dialog";
import { PageHeading, PageShell } from "@/components/site-shell";
import { isRefReviewed } from "@/data/reviews-store";
import { useReservations } from "@/lib/reservations";
import { useTranslation } from "@/i18n";

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

const STATUS_KEY: Record<string, string> = {
  Pendente: "statusPending",
  Confirmada: "statusConfirmed",
  Recusada: "statusRejected",
  Cancelada: "statusCanceled",
};

function Reservas() {
  const { reservations, updateReservationStatus } = useReservations();
  const { t } = useTranslation();
  const statusText = (s: string) => (STATUS_KEY[s] ? t(`reservas.${STATUS_KEY[s]}`) : s);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [review, setReview] = useState<{ id: string; restaurantId: string; name: string } | null>(
    null,
  );

  return (
    <PageShell>
      <PageHeading
        eyebrow={t("reservas.eyebrow")}
        title={t("reservas.title")}
        description={t("reservas.description")}
      />
      <div className="mx-auto mt-8 max-w-6xl px-4 md:px-6">
        {reservations.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            description={t("reservas.emptyText")}
            action={
              <Link
                to="/restaurantes"
                className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t("reservas.reserveTable")}
              </Link>
            }
          />
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
                    {r.date} · {r.time} · {t("reservas.peopleCount", { count: r.peopleCount })}
                  </p>
                  {r.status === "Pendente" && (
                    <button
                      type="button"
                      onClick={() => {
                        updateReservationStatus(r.id, "Cancelada");
                        toast.success(t("reservas.canceledToast"));
                      }}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                      {t("reservas.cancel")}
                    </button>
                  )}
                  {r.status === "Confirmada" &&
                    r.date < todayStr &&
                    !isRefReviewed(`reservation:${r.id}`) && (
                      <button
                        type="button"
                        onClick={() =>
                          setReview({
                            id: r.id,
                            restaurantId: r.restaurantId,
                            name: r.restaurantName,
                          })
                        }
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:underline"
                      >
                        <Star className="h-3 w-3" />
                        {t("reservas.rate")}
                      </button>
                    )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    r.status === "Confirmada"
                      ? "bg-success/15 text-success"
                      : r.status === "Recusada"
                        ? "bg-destructive/15 text-destructive"
                        : r.status === "Cancelada"
                          ? "bg-muted-foreground/15 text-muted-foreground"
                          : "bg-brand/15 text-brand"
                  }`}
                >
                  {statusText(r.status)}
                </span>
              </div>
            ))}
          </div>
        )}
        {reservations.length > 0 && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t("reservas.footerPrefix")}{" "}
            <Link to="/restaurantes" className="font-semibold text-primary hover:underline">
              {t("reservas.footerLink")}
            </Link>{" "}
            {t("reservas.footerSuffix")}
          </p>
        )}
      </div>

      {review && (
        <ReviewDialog
          open
          onOpenChange={(o) => !o && setReview(null)}
          restaurantId={review.restaurantId}
          restaurantName={review.name}
          sourceRef={`reservation:${review.id}`}
        />
      )}
    </PageShell>
  );
}
