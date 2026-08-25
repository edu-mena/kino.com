import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Check, Users, X } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeading } from "@/components/admin-shell";
import { useTranslation } from "@/i18n";
import { formatKz } from "@/lib/format";
import { useReservations } from "@/lib/reservations";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/reservas")({
  head: () => ({ meta: [{ title: "Reservas — Painel Kino.com" }] }),
  component: AdminReservas,
});

function AdminReservas() {
  const { restaurant } = useRestaurantAdmin();
  const { reservations, updateReservationStatus } = useReservations();
  const { t } = useTranslation();

  const statusLabels: Record<string, string> = {
    Pendente: t("adminReservas.statusPending"),
    Confirmada: t("adminReservas.statusConfirmed"),
    Recusada: t("adminReservas.statusRejected"),
  };

  if (!restaurant) return null;

  const restaurantReservations = reservations
    .filter((r) => r.restaurantId === restaurant.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const respond = (id: string, status: "Confirmada" | "Recusada") => {
    updateReservationStatus(id, status);
    toast.success(
      status === "Confirmada"
        ? t("adminReservas.confirmedToast")
        : t("adminReservas.rejectedToast"),
    );
  };

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminReservas.eyebrow")}
        title={t("adminReservas.title")}
        description={t("adminReservas.description")}
      />

      <div className="mx-auto mt-8 max-w-4xl space-y-3 px-4 md:px-6">
        {restaurantReservations.length === 0 && (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <CalendarCheck className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("adminReservas.emptyText")}</p>
          </div>
        )}

        {restaurantReservations.map((r) => (
          <div key={r.id} className="card-soft p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-base font-bold text-foreground">{r.customerName}</p>
                <p className="text-xs text-muted-foreground">
                  {r.customerPhone} {r.customerEmail ? `· ${r.customerEmail}` : ""}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  r.status === "Confirmada"
                    ? "bg-success/15 text-success"
                    : r.status === "Recusada"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-brand/15 text-brand"
                }`}
              >
                {statusLabels[r.status] ?? r.status}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarCheck className="h-4 w-4 text-primary" />
                {r.date} · {r.time}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                {r.peopleCount} {t("adminReservas.people")}
              </span>
              {r.cautionAmount > 0 && (
                <span className="flex items-center gap-1.5">
                  {t("adminReservas.caution")}: {formatKz(r.cautionAmount)}
                </span>
              )}
            </div>

            {r.specialRequests && (
              <p className="mt-2 rounded-lg bg-surface p-2.5 text-xs text-foreground">
                "{r.specialRequests}"
              </p>
            )}

            {r.status === "Pendente" && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => respond(r.id, "Recusada")}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-destructive/50 px-4 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5"
                >
                  <X className="h-3.5 w-3.5" />
                  {t("adminReservas.reject")}
                </button>
                <button
                  type="button"
                  onClick={() => respond(r.id, "Confirmada")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Check className="h-3.5 w-3.5" />
                  {t("adminReservas.confirm")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
