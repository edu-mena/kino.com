import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, ChevronLeft, ChevronRight, CreditCard, Search, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ADMIN_FILTER_SELECT, AdminField, KpiTile, StatSection } from "@/components/admin-stats";
import { SystemPageHeading } from "@/components/system-shell";
import { getAllRestaurants } from "@/data/helpers";
import { PLAN_PRICE, type SubscriptionPlan, type SubStatus } from "@/data/subscriptions-store";
import { useTranslation } from "@/i18n";
import { formatKz } from "@/lib/format";
import { useSubscriptions } from "@/lib/subscriptions";
import { BCP47 } from "@/lib/week";

export const Route = createFileRoute("/sistema/subscricoes")({
  head: () => ({ meta: [{ title: "Subscrições — Sistema Kino.com" }] }),
  validateSearch: (s: Record<string, unknown>) => {
    const r = s["r"];
    return { r: typeof r === "string" && r ? r : undefined };
  },
  component: SistemaSubscricoes,
});

const DAY = 86_400_000;

const statusTone: Record<SubStatus, string> = {
  trial: "bg-brand/15 text-brand",
  active: "bg-success/15 text-success",
  overdue: "bg-destructive/15 text-destructive",
  suspended: "bg-muted-foreground/15 text-muted-foreground",
};

function SistemaSubscricoes() {
  const { r: preselect } = Route.useSearch();
  const { subscriptions, mrr, counts, setPlan, setStatus, registerPayment, extendTrial } =
    useSubscriptions();
  const { t, locale } = useTranslation();
  const bcp = BCP47[locale];

  const restaurants = useMemo(() => getAllRestaurants(), []);
  const nameOf = (id: string) => restaurants.find((x) => x.id === id)?.name ?? id;

  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<"todos" | SubscriptionPlan>("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | SubStatus>("todos");
  const [activeId, setActiveId] = useState<string | null>(preselect ?? null);

  useEffect(() => {
    if (preselect) setActiveId(preselect);
  }, [preselect]);

  const monthlyBilled = useMemo(() => {
    const now = new Date();
    return subscriptions
      .filter((s) => {
        if (!s.lastPaymentAt) return false;
        const d = new Date(s.lastPaymentAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, s) => sum + PLAN_PRICE[s.plan], 0);
  }, [subscriptions]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subscriptions
      .filter((s) => {
        if (planFilter !== "todos" && s.plan !== planFilter) return false;
        if (statusFilter !== "todos" && s.status !== statusFilter) return false;
        if (q && !nameOf(s.restaurantId).toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const rank: Record<SubStatus, number> = { overdue: 0, trial: 1, active: 2, suspended: 3 };
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
        return nameOf(a.restaurantId).localeCompare(nameOf(b.restaurantId), "pt");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptions, query, planFilter, statusFilter, restaurants]);

  const active = useMemo(
    () => subscriptions.find((s) => s.restaurantId === activeId) ?? null,
    [subscriptions, activeId],
  );

  const fmtDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString(bcp, { day: "2-digit", month: "short", year: "numeric" })
      : "—";
  const trialDaysLeft = (iso: string) => Math.ceil((Date.parse(iso) - Date.now()) / DAY);

  return (
    <div className="pb-16">
      <SystemPageHeading
        eyebrow={t("sistema.subscricoes.eyebrow")}
        title={t("sistema.subscricoes.title")}
        description={t("sistema.subscricoes.description")}
      />

      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            icon={Wallet}
            tone="success"
            big={false}
            label={t("sistema.subscricoes.kpiMrr")}
            value={formatKz(mrr)}
            hint={t("sistema.subscricoes.kpiMrrHint", { count: counts.active })}
          />
          <KpiTile
            icon={CalendarClock}
            tone="brand"
            big={false}
            label={t("sistema.subStatus.trial")}
            value={String(counts.trial)}
            hint={t("sistema.subscricoes.kpiTrialHint")}
          />
          <KpiTile
            icon={CreditCard}
            tone="brand"
            big={false}
            label={t("sistema.subStatus.overdue")}
            value={String(counts.overdue)}
            hint={t("sistema.subscricoes.kpiOverdueHint")}
          />
          <KpiTile
            icon={Wallet}
            tone="primary"
            big={false}
            label={t("sistema.subscricoes.kpiBilled")}
            value={formatKz(monthlyBilled)}
            hint={t("sistema.subscricoes.kpiBilledHint")}
          />
        </div>

        <StatSection
          title={t("sistema.subscricoes.listTitle")}
          hint={t("sistema.subscricoes.listHint")}
        >
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 transition-colors focus-within:border-brand sm:max-w-xs">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("sistema.subscricoes.searchPlaceholder")}
                className="w-full min-w-0 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as typeof planFilter)}
              className={ADMIN_FILTER_SELECT}
            >
              <option value="todos">{t("sistema.subscricoes.planAll")}</option>
              <option value="basico">{t("sistema.plan.basico")}</option>
              <option value="pro">{t("sistema.plan.pro")}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className={ADMIN_FILTER_SELECT}
            >
              <option value="todos">{t("sistema.subscricoes.statusAll")}</option>
              <option value="trial">{t("sistema.subStatus.trial")}</option>
              <option value="active">{t("sistema.subStatus.active")}</option>
              <option value="overdue">{t("sistema.subStatus.overdue")}</option>
              <option value="suspended">{t("sistema.subStatus.suspended")}</option>
            </select>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            {/* Lista */}
            <div className={`min-w-0 ${activeId ? "hidden lg:block" : "block"}`}>
              <p className="px-1 text-xs font-medium text-muted-foreground">
                {t("sistema.subscricoes.resultsCount", { count: list.length })}
              </p>
              <div className="card-soft mt-2 overflow-hidden p-[5px]">
                <div className="mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] gap-3 rounded-[20rem] bg-primary px-6 py-4 text-sm font-bold uppercase tracking-wide text-white">
                  <span>{t("sistema.subscricoes.colRestaurant")}</span>
                  <span className="text-right">{t("sistema.subscricoes.colPlan")}</span>
                  <span className="pl-3 text-right">{t("sistema.subscricoes.colStatus")}</span>
                </div>
                {list.map((s, i) => (
                  <button
                    key={s.restaurantId}
                    type="button"
                    onClick={() => setActiveId(s.restaurantId)}
                    className={`mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[20rem] px-5 py-3 text-left transition-colors last:mb-0 ${
                      activeId === s.restaurantId
                        ? "bg-primary/10"
                        : i % 2 === 1
                          ? "bg-surface/70 hover:bg-primary/5"
                          : "hover:bg-primary/5"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {nameOf(s.restaurantId)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {s.status === "trial"
                          ? t("sistema.subscricoes.trialLeft", {
                              days: Math.max(0, trialDaysLeft(s.trialEndsAt)),
                            })
                          : t("sistema.subscricoes.lastPayment", {
                              date: fmtDate(s.lastPaymentAt),
                            })}
                      </span>
                    </span>
                    <span className="text-right text-xs font-semibold text-foreground">
                      {t(`sistema.plan.${s.plan}`)}
                    </span>
                    <span className="flex items-center gap-1 pl-3">
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${statusTone[s.status]}`}
                      >
                        {t(`sistema.subStatus.${s.status}`)}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </span>
                  </button>
                ))}
                {list.length === 0 && (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    {t("sistema.subscricoes.empty")}
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
                          {nameOf(active.restaurantId)}
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t("sistema.subscricoes.since", { date: fmtDate(active.startedAt) })}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusTone[active.status]}`}
                      >
                        {t(`sistema.subStatus.${active.status}`)}
                      </span>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-5 text-sm">
                      <AdminField label={t("sistema.subscricoes.colPlan")}>
                        {t(`sistema.plan.${active.plan}`)} · {formatKz(PLAN_PRICE[active.plan])}
                        {t("sistema.subscricoes.perMonth")}
                      </AdminField>
                      <AdminField label={t("sistema.subscricoes.trialEnds")}>
                        {fmtDate(active.trialEndsAt)}
                      </AdminField>
                      <AdminField label={t("sistema.subscricoes.lastPaymentLabel")}>
                        {fmtDate(active.lastPaymentAt)}
                      </AdminField>
                      <AdminField label={t("sistema.subscricoes.trialLeftLabel")}>
                        {active.status === "trial"
                          ? t("sistema.subscricoes.daysValue", {
                              days: Math.max(0, trialDaysLeft(active.trialEndsAt)),
                            })
                          : "—"}
                      </AdminField>
                    </dl>

                    {/* Plano */}
                    <div className="mt-5 border-t border-border pt-5">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {t("sistema.subscricoes.changePlan")}
                      </p>
                      <div className="mt-2 flex gap-2">
                        {(["basico", "pro"] as const).map((plan) => (
                          <button
                            key={plan}
                            type="button"
                            onClick={() => {
                              setPlan(active.restaurantId, plan);
                              toast.success(
                                t("sistema.subscricoes.planToast", {
                                  plan: t(`sistema.plan.${plan}`),
                                }),
                              );
                            }}
                            className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                              active.plan === plan
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary"
                            }`}
                          >
                            {t(`sistema.plan.${plan}`)}
                            <span className="mt-0.5 block text-[11px] font-medium">
                              {formatKz(PLAN_PRICE[plan])}
                              {t("sistema.subscricoes.perMonth")}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
                      <button
                        type="button"
                        onClick={() => {
                          registerPayment(active.restaurantId);
                          toast.success(t("sistema.subscricoes.paymentToast"));
                        }}
                        className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        {t("sistema.subscricoes.registerPayment")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          extendTrial(active.restaurantId, 30);
                          toast.success(t("sistema.subscricoes.extendToast"));
                        }}
                        className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:border-primary"
                      >
                        {t("sistema.subscricoes.extendTrial")}
                      </button>
                      {active.status === "suspended" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setStatus(active.restaurantId, "active");
                            toast.success(t("sistema.subscricoes.reactivateToast"));
                          }}
                          className="rounded-xl border border-success/50 px-4 py-2.5 text-xs font-semibold text-success transition-colors hover:bg-success/5"
                        >
                          {t("sistema.subscricoes.reactivate")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setStatus(active.restaurantId, "suspended");
                            toast.success(t("sistema.subscricoes.suspendToast"));
                          }}
                          className="rounded-xl border border-dashed border-destructive/50 px-4 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5"
                        >
                          {t("sistema.subscricoes.suspend")}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="grid place-items-center gap-3 py-12 text-center">
                    <CreditCard className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t("sistema.subscricoes.chooseHint")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </StatSection>
      </div>
    </div>
  );
}
