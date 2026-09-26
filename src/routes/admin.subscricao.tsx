import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Check, CheckCircle2, CreditCard, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeading } from "@/components/admin-shell";
import { KpiTile } from "@/components/admin-stats";
import { useOwnRestaurantSubscription } from "@/data/api-subscriptions";
import { PLAN_PRICE, type SubscriptionPlan } from "@/data/subscriptions-store";
import { useTranslation } from "@/i18n";
import { hasRealBackend } from "@/lib/api-client";
import { formatKz } from "@/lib/format";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useSubscriptions } from "@/lib/subscriptions";
import { BCP47 } from "@/lib/week";

const PLAN_ORDER: SubscriptionPlan[] = ["pro", "plus"];
const PLAN_PERK_KEYS: Record<SubscriptionPlan, string[]> = {
  pro: ["perkCore", "perkMenu", "perkStories2", "perkPromo2", "perkTables", "perkReservations20"],
  plus: [
    "perkCore",
    "perkMenu",
    "perkMenuAdvanced",
    "perkStoriesUnlimited",
    "perkPromoUnlimited",
    "perkTables",
    "perkReservationsUnlimited",
    "perkPackages",
    "perkCustomers",
    "perkStats",
  ],
};

export const Route = createFileRoute("/admin/subscricao")({
  head: () => ({ meta: [{ title: "Subscrição — Painel Luku.com" }] }),
  component: AdminSubscricao,
});

const DAY = 86_400_000;

function AdminSubscricao() {
  const { restaurant } = useRestaurantAdmin();
  const { byRestaurant, registerPayment, setPlan } = useSubscriptions();
  const real = useOwnRestaurantSubscription(hasRealBackend ? restaurant?.id : undefined);
  const { t, locale } = useTranslation();

  if (!restaurant) return null;
  const sub = hasRealBackend ? real.sub : byRestaurant(restaurant.id);
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

        {/* Comparar planos */}
        <div className="card-soft p-6">
          <h2 className="font-display text-base font-bold text-foreground">
            {t("adminSubscricao.plansTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("adminSubscricao.plansHint")}</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {PLAN_ORDER.map((plan) => {
              const isCurrent = plan === sub.plan;
              return (
                <div
                  key={plan}
                  className={`rounded-xl border p-4 ${
                    isCurrent ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-sm font-bold text-foreground">
                      {t(`sistema.plan.${plan}`)}
                    </p>
                    {isCurrent && (
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                        {t("adminSubscricao.currentPlanBadge")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-lg font-extrabold text-primary">
                    {formatKz(PLAN_PRICE[plan])}
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("adminSubscricao.perMonth")}
                    </span>
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {PLAN_PERK_KEYS[plan].map((key) => (
                      <li key={key} className="flex items-start gap-1.5 text-xs text-foreground">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                        <span>{t(`adminSubscricao.${key}`)}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() => {
                      // Mudar de plano é billing — system_operator-only no
                      // backend real (mesma razão de registerPayment abaixo).
                      if (hasRealBackend) {
                        toast.info(t("adminSubscricao.renewContactSupport"));
                        return;
                      }
                      setPlan(restaurant.id, plan);
                      toast.success(t("adminSubscricao.planChangedToast"));
                    }}
                    className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
                  >
                    {isCurrent
                      ? t("adminSubscricao.currentPlanBadge")
                      : t("adminSubscricao.switchTo", { plan: t(`sistema.plan.${plan}`) })}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ações */}
        <div className="card-soft p-6">
          <h2 className="font-display text-base font-bold text-foreground">
            {t("adminSubscricao.actionsTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("adminSubscricao.actionsHint")}</p>

          <button
            type="button"
            onClick={() => {
              // Registar pagamento é system_operator-only no backend real
              // (billing é assunto interno Luku, nunca self-service — ver
              // SubscriptionController::registerPayment) — chamar isto
              // aqui daria 403. Só o mock simula o pagamento em si.
              if (hasRealBackend) {
                toast.info(t("adminSubscricao.renewContactSupport"));
                return;
              }
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
