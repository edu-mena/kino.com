import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Mail,
  MapPin,
  Phone,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ADMIN_FILTER_SELECT, AdminField } from "@/components/admin-stats";
import { SystemPageHeading } from "@/components/system-shell";
import { createRestaurant } from "@/data/custom-restaurants-store";
import { createMenu } from "@/data/menus-store";
import type { PartnerAppStatus } from "@/data/partner-apps-store";
import { addTable } from "@/data/tables-store";
import { useTranslation } from "@/i18n";
import { usePartnerApps } from "@/lib/partner-apps";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useSubscriptions } from "@/lib/subscriptions";
import { BCP47 } from "@/lib/week";

export const Route = createFileRoute("/sistema/parceiros")({
  head: () => ({ meta: [{ title: "Candidaturas — Sistema Kino.com" }] }),
  component: SistemaParceiros,
});

const statusTone: Record<PartnerAppStatus, string> = {
  pending: "bg-brand/15 text-brand",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
};

function SistemaParceiros() {
  const { applications, counts, approve, reject, remove } = usePartnerApps();
  const { createSubscription } = useSubscriptions();
  const { login: enterPanel } = useRestaurantAdmin();
  const navigate = useNavigate();

  const onboard = (app: (typeof applications)[number]) => {
    const restaurant = createRestaurant({
      name: app.restaurantName,
      cuisine: "",
      neighborhood: app.province,
      city: app.province,
      phone: app.phone,
      email: app.email,
    });
    createSubscription(restaurant.id, "basico");
    createMenu(restaurant.id, "Cardápio Principal");
    addTable({ restaurantId: restaurant.id, name: "Mesa 1", seats: 4, area: "Interior" });
    addTable({ restaurantId: restaurant.id, name: "Mesa 2", seats: 2, area: "Interior" });
    addTable({ restaurantId: restaurant.id, name: "Mesa 3", seats: 6, area: "Interior" });
    approve(app.id);
    toast.success(t("sistema.parceiros.onboardedToast", { name: restaurant.name }), {
      action: {
        label: t("sistema.parceiros.enterPanel"),
        onClick: () => {
          enterPanel(restaurant.id);
          navigate({ to: "/admin" });
        },
      },
    });
  };
  const { t, locale } = useTranslation();

  const [statusFilter, setStatusFilter] = useState<"todos" | PartnerAppStatus>("pending");
  const [activeId, setActiveId] = useState<string | null>(null);

  const list = useMemo(() => {
    return applications
      .filter((a) => statusFilter === "todos" || a.status === statusFilter)
      .sort((a, b) => {
        const rank: Record<PartnerAppStatus, number> = { pending: 0, approved: 1, rejected: 2 };
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      });
  }, [applications, statusFilter]);

  const active = useMemo(
    () => applications.find((a) => a.id === activeId) ?? null,
    [applications, activeId],
  );

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(BCP47[locale], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="pb-16">
      <SystemPageHeading
        eyebrow={t("sistema.parceiros.eyebrow")}
        title={t("sistema.parceiros.title")}
        description={t("sistema.parceiros.description")}
      />

      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-brand/15 px-3 py-1 text-brand">
            {t("sistema.parceiros.countPending", { count: counts.pending })}
          </span>
          <span className="rounded-full bg-success/15 px-3 py-1 text-success">
            {t("sistema.parceiros.countApproved", { count: counts.approved })}
          </span>
          <span className="rounded-full bg-destructive/15 px-3 py-1 text-destructive">
            {t("sistema.parceiros.countRejected", { count: counts.rejected })}
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className={`${ADMIN_FILTER_SELECT} ml-auto`}
          >
            <option value="todos">{t("sistema.parceiros.filterAll")}</option>
            <option value="pending">{t("sistema.parceiros.statusPending")}</option>
            <option value="approved">{t("sistema.parceiros.statusApproved")}</option>
            <option value="rejected">{t("sistema.parceiros.statusRejected")}</option>
          </select>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Lista */}
          <div className={`min-w-0 ${activeId ? "hidden lg:block" : "block"}`}>
            <p className="px-1 text-xs font-medium text-muted-foreground">
              {t("sistema.parceiros.resultsCount", { count: list.length })}
            </p>
            <div className="card-soft mt-2 overflow-hidden p-[5px]">
              <div className="mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[20rem] bg-primary px-6 py-4 text-sm font-bold uppercase tracking-wide text-white">
                <span>{t("sistema.parceiros.colApplicant")}</span>
                <span className="pl-3 text-right">{t("sistema.parceiros.colStatus")}</span>
              </div>
              {list.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActiveId(a.id)}
                  className={`mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[20rem] px-5 py-3 text-left transition-colors last:mb-0 ${
                    activeId === a.id
                      ? "bg-primary/10"
                      : i % 2 === 1
                        ? "bg-surface/70 hover:bg-primary/5"
                        : "hover:bg-primary/5"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {a.restaurantName}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {a.province} · {fmtDate(a.createdAt)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 pl-3">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${statusTone[a.status]}`}
                    >
                      {t(
                        `sistema.parceiros.status${a.status[0]!.toUpperCase()}${a.status.slice(1)}`,
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </span>
                </button>
              ))}
              {list.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  {t("sistema.parceiros.empty")}
                </p>
              )}
            </div>
          </div>

          {/* Detalhe */}
          <div className={`min-w-0 ${activeId ? "block" : "hidden lg:block"}`}>
            <div className="card-soft sticky top-24 p-6 lg:top-6">
              {active ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveId(null)}
                    className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary lg:hidden"
                  >
                    <ChevronLeft className="h-4 w-4" /> {t("common.back")}
                  </button>

                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-display text-lg font-bold text-primary">
                        {active.restaurantName}
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("sistema.parceiros.received", { date: fmtDate(active.createdAt) })}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusTone[active.status]}`}
                    >
                      {t(
                        `sistema.parceiros.status${active.status[0]!.toUpperCase()}${active.status.slice(1)}`,
                      )}
                    </span>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-5 text-sm">
                    <AdminField label={t("sistema.parceiros.ownerLabel")}>
                      {active.ownerName}
                    </AdminField>
                    <AdminField label={t("sistema.parceiros.provinceLabel")}>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {active.province}
                      </span>
                    </AdminField>
                    <AdminField label={t("sistema.parceiros.phoneLabel")}>
                      <a
                        href={`tel:${active.phone.replace(/\s/g, "")}`}
                        className="inline-flex items-center gap-1.5 hover:text-primary"
                      >
                        <Phone className="h-3.5 w-3.5 text-primary" />
                        {active.phone}
                      </a>
                    </AdminField>
                    <AdminField label={t("sistema.parceiros.emailLabel")}>
                      <a
                        href={`mailto:${active.email}`}
                        className="inline-flex items-center gap-1.5 hover:text-primary"
                      >
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        <span className="truncate">{active.email}</span>
                      </a>
                    </AdminField>
                  </dl>

                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {t("sistema.parceiros.messageLabel")}
                    </p>
                    <p className="mt-1.5 rounded-lg bg-surface p-3 text-sm text-foreground">
                      {active.message}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
                    {active.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            reject(active.id);
                            toast.success(t("sistema.parceiros.rejectToast"));
                          }}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-destructive/50 px-4 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5"
                        >
                          <X className="h-3.5 w-3.5" /> {t("sistema.parceiros.reject")}
                        </button>
                        <button
                          type="button"
                          onClick={() => onboard(active)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                        >
                          <Check className="h-3.5 w-3.5" /> {t("sistema.parceiros.approve")}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          remove(active.id);
                          setActiveId(null);
                          toast.success(t("sistema.parceiros.removeToast"));
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {t("sistema.parceiros.removeDecided")}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="grid place-items-center gap-3 py-12 text-center">
                  <Inbox className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t("sistema.parceiros.chooseHint")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
