import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, CreditCard, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeading } from "@/components/admin-shell";
import { KpiTile } from "@/components/admin-stats";
import { PLAN_PRICE, type SubscriptionPlan } from "@/data/subscriptions-store";
import { useTranslation } from "@/i18n";
import { formatKz } from "@/lib/format";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useSubscriptions } from "@/lib/subscriptions";
import { BCP47 } from "@/lib/week";

export const Route = createFileRoute("/admin/subscricao")({
  head: () => ({ meta: [{ title: "Subscrição — Painel Kino.com" }] }),
  component: AdminSubscricao,
});

const DAY = 86_400_000;

function AdminSubscricao() {
  const { restaurant } = useRestaurantAdmin();
  const { byRestaurant, setPlan, registerPayment } = useSubscriptions();
  const { t, locale } = useTranslation();

  if (!restaurant) return null;
  const sub = byRestaurant(restaurant.id);
  if (!sub) return null;

  const bcp = BCP47[locale];
  const fmtDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString(bcp, { day: "2-digit", month: "long", year: "numeric" })
      : "—";
  const trialDaysLeft = Math.max(0, Math.ceil((Date.parse(sub.trialEndsAt) - Date.now()) / DAY));

  const statusTone =
    sub.status === "active"
      ? "bg-success/15 text-success"
      : sub.status === "trial"
        ? "bg-brand/15 text-brand"
        : sub.status === "overdue"
          ? "bg-destructive/15 text-destructive"
          : "bg-muted-foreground/15 text-muted-foreground";

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminSubscricao.eyebrow")}
        title={t("adminSubscricao.title")}
        description={t("adminSubscricao.description")}
      />

      <div className="mx-auto mt-8 max-w-4xl space-y-6 px-4 md:px-6">
        {/* Estado */}
        <div className="card-soft p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("adminSubscricao.currentPlan")}
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold text-primary">
                {t(`sistema.plan.${sub.plan}`)} · {formatKz(PLAN_PRICE[sub.plan])}
                {t("adminSubscricao.perMonth")}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusTone}`}>
              {t(`sistema.subStatus.${sub.status}`)}
            </span>
          </div>

          {sub.status === "suspended" && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("adminSubscricao.suspendedNote")}</span>
            </div>
          )}
          {sub.status === "overdue" && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand/30 bg-brand/5 p-3 text-xs text-brand">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("adminSubscricao.overdueNote")}</span>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiTile
            icon={CalendarClock}
            tone="brand"
            big={false}
            label={t("adminSubscricao.trialLeft")}
            value={sub.status === "trial" ? String(trialDaysLeft) : "—"}
            hint={
              sub.status === "trial"
                ? t("adminSubscricao.trialEnds", { date: fmtDate(sub.trialEndsAt) })
                : t("adminSubscricao.trialOver")
            }
          />
          <KpiTile
            icon={CheckCircle2}
            tone="success"
            big={false}
            label={t("adminSubscricao.lastPayment")}
            value={sub.lastPaymentAt ? fmtDate(sub.lastPaymentAt) : "—"}
            hint={t("adminSubscricao.lastPaymentHint")}
          />
          <KpiTile
            icon={CreditCard}
            tone="primary"
            big={false}
            label={t("adminSubscricao.since")}
            value={fmtDate(sub.startedAt)}
            hint={t("adminSubscricao.sinceHint")}
          />
        </div>

        {/* Ações */}
        <div className="card-soft p-6">
          <h2 className="font-display text-base font-bold text-foreground">
            {t("adminSubscricao.actionsTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("adminSubscricao.actionsHint")}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["basico", "pro"] as SubscriptionPlan[]).map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => {
                  setPlan(restaurant.id, plan);
                  toast.success(
                    t("adminSubscricao.planToast", { plan: t(`sistema.plan.${plan}`) }),
                  );
                }}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  sub.plan === plan
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary"
                }`}
              >
                <p className="font-display text-sm font-bold text-foreground">
                  {t(`sistema.plan.${plan}`)}
                </p>
                <p className="mt-0.5 text-lg font-extrabold text-primary">
                  {formatKz(PLAN_PRICE[plan])}
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("adminSubscricao.perMonth")}
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan === "pro" ? t("adminSubscricao.proPerks") : t("adminSubscricao.basicPerks")}
                </p>
                {sub.plan === plan && (
                  <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {t("adminSubscricao.currentBadge")}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              registerPayment(restaurant.id);
              toast.success(t("adminSubscricao.renewToast"));
            }}
            className="mt-4 w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t("adminSubscricao.renewSimulated")}
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t("adminSubscricao.renewNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
