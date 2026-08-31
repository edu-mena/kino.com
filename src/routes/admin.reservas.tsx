import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Mail,
  Phone,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeading } from "@/components/admin-shell";
import { useTranslation, type Locale } from "@/i18n";
import { formatKz } from "@/lib/format";
import { useReservations } from "@/lib/reservations";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export const Route = createFileRoute("/admin/reservas")({
  head: () => ({ meta: [{ title: "Reservas — Painel Kino.com" }] }),
  component: AdminReservas,
});

const BCP47: Record<Locale, string> = { pt: "pt-PT", en: "en-GB", fr: "fr-FR" };

type StatusFilter = "todos" | "Pendente" | "Confirmada" | "Recusada";
type TimeFilter = "upcoming" | "today" | "past" | "all";
type SortKey = "recent" | "date";

const statusTone: Record<string, string> = {
  Confirmada: "bg-success/15 text-success",
  Recusada: "bg-destructive/15 text-destructive",
  Pendente: "bg-brand/15 text-brand",
};

/** "2026-08-31 14:02" e ISO ("2026-08-31T14:02:00Z") entram os dois. */
const toTime = (raw: string) => new Date(raw.replace(" ", "T")).getTime();
const dayOf = (raw: string) => raw.slice(0, 10);

/** Segunda-feira 00:00 da semana de `d` — base dos baldes semanais do gráfico. */
function weekStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function AdminReservas() {
  const { restaurant } = useRestaurantAdmin();
  const { reservations, updateReservationStatus } = useReservations();
  const { t, locale } = useTranslation();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [activeId, setActiveId] = useState<string | null>(null);

  const statusLabels: Record<string, string> = {
    Pendente: t("adminReservas.statusPending"),
    Confirmada: t("adminReservas.statusConfirmed"),
    Recusada: t("adminReservas.statusRejected"),
  };

  const mine = useMemo(
    () => (restaurant ? reservations.filter((r) => r.restaurantId === restaurant.id) : []),
    [reservations, restaurant],
  );

  // "Hoje" de referência: o pedido mais recente que este restaurante recebeu.
  // Sem backend não há relógio partilhado — ancorar nos próprios dados mantém
  // as métricas de "próximos dias"/"passadas" coerentes com a seed e ajusta-se
  // sozinho quando entra uma reserva nova (createdAt real).
  const todayStr = useMemo(() => {
    if (mine.length === 0) return new Date().toISOString().slice(0, 10);
    const latest = Math.max(...mine.map((r) => toTime(r.createdAt)));
    return new Date(latest).toISOString().slice(0, 10);
  }, [mine]);

  const fmtDate = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString(BCP47[locale], {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });

  const statusCounts = useMemo(() => {
    const c = { todos: mine.length, Pendente: 0, Confirmada: 0, Recusada: 0 } as Record<
      StatusFilter,
      number
    >;
    for (const r of mine) if (r.status in c) c[r.status as StatusFilter] += 1;
    return c;
  }, [mine]);

  const metrics = useMemo(() => {
    const decided = mine.filter((r) => r.status !== "Pendente");
    const confirmed = mine.filter((r) => r.status === "Confirmada");
    return {
      confirmRate: decided.length ? Math.round((confirmed.length / decided.length) * 100) : 0,
      confirmedCount: confirmed.length,
      decidedCount: decided.length,
      deposit: mine
        .filter((r) => r.status !== "Recusada" && r.cautionStatus?.startsWith("Paga"))
        .reduce((s, r) => s + r.cautionAmount, 0),
    };
  }, [mine]);

  // Dados para os gráficos: baldes semanais (tendência), distribuição por
  // estado (comparação) e um strip dos próximos 7 dias (planeamento).
  const insights = useMemo(() => {
    const anchor = weekStart(new Date(`${todayStr}T12:00:00`));
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(anchor);
      start.setDate(start.getDate() - (7 - i) * 7);
      return { key: start.getTime(), start, total: 0, confirmed: 0 };
    });
    const byKey = new Map(weeks.map((w) => [w.key, w]));
    for (const r of mine) {
      const wk = byKey.get(weekStart(new Date(`${r.date}T12:00:00`)).getTime());
      if (!wk) continue;
      wk.total += 1;
      if (r.status === "Confirmada") wk.confirmed += 1;
    }
    const prev = weeks[5]?.total ?? 0;
    const lastFull = weeks[6]?.total ?? 0;
    const weekDelta = prev > 0 ? Math.round(((lastFull - prev) / prev) * 100) : null;

    const total = mine.length || 1;
    const dist = (["Pendente", "Confirmada", "Recusada"] as const).map((k) => ({
      key: k,
      count: statusCounts[k],
      pct: Math.round((statusCounts[k] / total) * 100),
    }));

    const next7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${todayStr}T12:00:00`);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dayRes = mine.filter((r) => dayOf(r.date) === iso && r.status === "Confirmada");
      return {
        label: d.toLocaleDateString(BCP47[locale], { weekday: "narrow" }),
        count: dayRes.length,
        covers: dayRes.reduce((s, r) => s + r.peopleCount, 0),
      };
    });

    return {
      weeks,
      weekDelta,
      dist,
      next7,
      next7Count: next7.reduce((s, d) => s + d.count, 0),
      next7Covers: next7.reduce((s, d) => s + d.covers, 0),
      depositCount: mine.filter(
        (r) => r.status !== "Recusada" && r.cautionStatus?.startsWith("Paga"),
      ).length,
    };
  }, [mine, statusCounts, todayStr, locale]);

  const list = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    let rows = mine.filter((r) => {
      if (statusFilter !== "todos" && r.status !== statusFilter) return false;
      const day = dayOf(r.date);
      if (timeFilter === "upcoming" && day < todayStr) return false;
      if (timeFilter === "today" && day !== todayStr) return false;
      if (timeFilter === "past" && day >= todayStr) return false;
      if (
        q &&
        ![r.customerName, r.customerPhone, r.customerEmail].some((v) => v.toLowerCase().includes(q))
      )
        return false;
      return true;
    });
    rows = rows.sort((a, b) =>
      sortKey === "recent"
        ? toTime(b.createdAt) - toTime(a.createdAt)
        : toTime(`${a.date}T${a.time}`) - toTime(`${b.date}T${b.time}`),
    );
    return rows;
  }, [mine, debouncedQuery, statusFilter, timeFilter, sortKey, todayStr]);

  const active = activeId ? (mine.find((r) => r.id === activeId) ?? null) : null;

  const customerHistory = useMemo(() => {
    if (!active) return [];
    const key = active.customerEmail || active.customerPhone || active.customerName;
    return mine
      .filter((r) => (r.customerEmail || r.customerPhone || r.customerName) === key)
      .sort((a, b) => toTime(`${b.date}T${b.time}`) - toTime(`${a.date}T${a.time}`));
  }, [active, mine]);

  if (!restaurant) return null;

  const respond = (id: string, status: string, toastKey: string) => {
    updateReservationStatus(id, status);
    toast.success(t(`adminReservas.${toastKey}`));
  };

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "todos", label: t("adminReservas.statusAll") },
    { value: "Pendente", label: t("adminReservas.statusPending") },
    { value: "Confirmada", label: t("adminReservas.statusConfirmed") },
    { value: "Recusada", label: t("adminReservas.statusRejected") },
  ];
  const timeOptions: { value: TimeFilter; label: string }[] = [
    { value: "upcoming", label: t("adminReservas.filterTimeUpcoming") },
    { value: "today", label: t("adminReservas.filterTimeToday") },
    { value: "past", label: t("adminReservas.filterTimePast") },
    { value: "all", label: t("adminReservas.filterTimeAll") },
  ];

  const selectClass =
    "rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground accent-brand outline-none transition-colors focus:border-brand focus:text-brand";

  return (
    <div className="pb-16">
      <AdminPageHeading eyebrow={t("adminReservas.eyebrow")} title={t("adminReservas.title")} />

      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
        {mine.length === 0 ? (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <CalendarCheck className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("adminReservas.emptyText")}</p>
          </div>
        ) : (
          <>
            {/* Pesquisa + filtros (no lugar da descrição) */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 transition-colors focus-within:border-brand has-[:focus]:text-brand sm:max-w-xs">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("adminReservas.searchPlaceholder")}
                  className="w-full min-w-0 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className={selectClass}
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} ({statusCounts[o.value]})
                  </option>
                ))}
              </select>

              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                className={selectClass}
              >
                {timeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className={selectClass}
              >
                <option value="date">{t("adminReservas.sortDate")}</option>
                <option value="recent">{t("adminReservas.sortRecent")}</option>
              </select>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              {/* Lista */}
              <div className={`min-w-0 ${activeId ? "hidden lg:block" : "block"}`}>
                <p className="px-1 text-xs font-medium text-muted-foreground">
                  {t("adminReservas.resultsCount", { count: list.length })}
                </p>

                <div className="card-soft mt-2 overflow-hidden p-[5px]">
                  {/* Cabeçalho da lista — pílula verde */}
                  <div className="mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] gap-3 rounded-[20rem] bg-primary px-6 py-4 text-sm font-bold uppercase tracking-wide text-white">
                    <span>{t("adminReservas.colCustomer")}</span>
                    <span className="text-right">{t("adminReservas.colWhen")}</span>
                    <span className="pl-3 text-right">{t("adminReservas.colStatus")}</span>
                  </div>

                  <div>
                    {list.map((r, i) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setActiveId(r.id)}
                        className={`mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[20rem] px-6 py-3 text-left transition-colors last:mb-0 ${
                          activeId === r.id
                            ? "bg-primary/10"
                            : i % 2 === 1
                              ? "bg-surface/70 hover:bg-primary/5"
                              : "hover:bg-primary/5"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {r.customerName}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3 shrink-0" />
                            {r.peopleCount} {t("adminReservas.people")}
                          </span>
                        </span>
                        <span className="text-right text-xs text-foreground">
                          <span className="block font-medium capitalize">{fmtDate(r.date)}</span>
                          <span className="text-muted-foreground">{r.time}</span>
                        </span>
                        <span className="flex items-center gap-1 pl-3">
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              statusTone[r.status] ?? "bg-surface text-muted-foreground"
                            }`}
                          >
                            {statusLabels[r.status] ?? r.status}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </span>
                      </button>
                    ))}
                    {list.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        {t("adminReservas.emptyNoResults")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Detalhe + ação */}
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
                          <h2 className="font-display text-xl font-bold text-primary">
                            {active.customerName}
                          </h2>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {t("adminReservas.detailCreatedAt")}{" "}
                            {new Date(active.createdAt.replace(" ", "T")).toLocaleString(
                              BCP47[locale],
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                            statusTone[active.status] ?? "bg-surface text-muted-foreground"
                          }`}
                        >
                          {statusLabels[active.status] ?? active.status}
                        </span>
                      </div>

                      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-5 text-sm">
                        <Field label={t("adminReservas.detailWhen")}>
                          <span className="capitalize">{fmtDate(active.date)}</span> · {active.time}
                        </Field>
                        <Field label={t("adminReservas.detailPeople")}>
                          {active.peopleCount} {t("adminReservas.people")}
                        </Field>
                        <Field label={t("adminReservas.detailContact")}>
                          <a
                            href={`tel:${active.customerPhone.replace(/\s/g, "")}`}
                            className="flex items-center gap-1.5 text-foreground hover:text-primary"
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                            {active.customerPhone}
                          </a>
                          {active.customerEmail && (
                            <a
                              href={`mailto:${active.customerEmail}`}
                              className="mt-1 flex items-center gap-1.5 text-foreground hover:text-primary"
                            >
                              <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                              <span className="truncate">{active.customerEmail}</span>
                            </a>
                          )}
                        </Field>
                        <Field label={t("adminReservas.detailDeposit")}>
                          {active.cautionAmount > 0 ? formatKz(active.cautionAmount) : "—"}
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {active.cautionStatus}
                          </span>
                        </Field>
                      </dl>

                      <div className="mt-4 border-t border-border pt-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {t("adminReservas.detailRequests")}
                        </p>
                        <p className="mt-1.5 rounded-lg bg-surface p-3 text-sm text-foreground">
                          {active.specialRequests || t("adminReservas.noRequests")}
                        </p>
                      </div>

                      {/* Histórico do cliente */}
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {t("adminReservas.historyTitle")}
                        </p>
                        {customerHistory.length <= 1 ? (
                          <p className="mt-1.5 text-sm text-muted-foreground">
                            {t("adminReservas.historyEmpty")}
                          </p>
                        ) : (
                          <>
                            <p className="mt-1.5 text-xs text-muted-foreground">
                              {t("adminReservas.historySummary", {
                                total: customerHistory.length,
                                confirmed: customerHistory.filter((r) => r.status === "Confirmada")
                                  .length,
                                rejected: customerHistory.filter((r) => r.status === "Recusada")
                                  .length,
                              })}
                            </p>
                            <ul className="mt-2 space-y-1.5">
                              {customerHistory.map((r) => (
                                <li
                                  key={r.id}
                                  className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs ${
                                    r.id === active.id ? "bg-primary/10" : "bg-surface"
                                  }`}
                                >
                                  <span className="min-w-0 truncate text-foreground">
                                    <span className="capitalize">{fmtDate(r.date)}</span> · {r.time}{" "}
                                    · {r.peopleCount} {t("adminReservas.people")}
                                    {r.id === active.id && (
                                      <span className="ml-1 text-primary">
                                        ({t("adminReservas.historyCurrent")})
                                      </span>
                                    )}
                                  </span>
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${
                                      statusTone[r.status] ?? "bg-card text-muted-foreground"
                                    }`}
                                  >
                                    {statusLabels[r.status] ?? r.status}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
                        {active.status === "Pendente" && (
                          <>
                            <button
                              type="button"
                              onClick={() => respond(active.id, "Recusada", "rejectedToast")}
                              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-destructive/50 px-4 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5"
                            >
                              {t("adminReservas.reject")}
                            </button>
                            <button
                              type="button"
                              onClick={() => respond(active.id, "Confirmada", "confirmedToast")}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                            >
                              {t("adminReservas.confirm")}
                            </button>
                          </>
                        )}
                        {active.status === "Confirmada" && (
                          <button
                            type="button"
                            onClick={() => respond(active.id, "Recusada", "canceledToast")}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-destructive/50 px-4 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5"
                          >
                            {t("adminReservas.cancel")}
                          </button>
                        )}
                        {active.status === "Recusada" && (
                          <button
                            type="button"
                            onClick={() => respond(active.id, "Pendente", "reopenedToast")}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface"
                          >
                            {t("adminReservas.reopen")}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="grid place-items-center gap-3 py-12 text-center">
                      <CalendarCheck className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t("adminReservas.chooseHint")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Estatísticas — por baixo da lista de pedidos */}
        {mine.length > 0 && (
          <section className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="font-display text-lg font-bold text-foreground">
                {t("adminReservas.statsTitle")}
              </h2>
              <p className="text-xs text-muted-foreground">{t("adminReservas.statsHint")}</p>
            </div>

            {/* Linha 1 — tendência + comparação */}
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="card-soft p-5 sm:p-6 lg:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {t("adminReservas.chartWeeklyTitle")}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("adminReservas.chartWeeklySubtitle")}
                    </p>
                  </div>
                  {insights.weekDelta !== null && (
                    <span
                      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${
                        insights.weekDelta >= 0
                          ? "bg-success/15 text-success"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {insights.weekDelta >= 0 ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                      {Math.abs(insights.weekDelta)}%
                      <span className="font-medium text-muted-foreground">
                        {t("adminReservas.vsPrevWeek")}
                      </span>
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <TrendChart
                    weeks={insights.weeks}
                    locale={locale}
                    legendTotal={t("adminReservas.legendTotal")}
                    legendConfirmed={t("adminReservas.legendConfirmed")}
                  />
                </div>
              </div>

              <div className="card-soft p-5 sm:p-6">
                <h3 className="text-sm font-bold text-foreground">
                  {t("adminReservas.statusDistTitle")}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("adminReservas.resultsCount", { count: mine.length })}
                </p>
                <div className="mt-5">
                  <StatusBars dist={insights.dist} labels={statusLabels} />
                </div>
              </div>
            </div>

            {/* Linha 2 — KPIs em formatos distintos */}
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="card-soft p-5 sm:p-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-success" />
                  {t("adminReservas.metricConfirmRate")}
                </div>
                <p className="mt-3 font-display text-4xl font-extrabold text-success">
                  {metrics.confirmRate}%
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: `${metrics.confirmRate}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("adminReservas.metricConfirmRateHint", {
                    confirmed: metrics.confirmedCount,
                    decided: metrics.decidedCount,
                  })}
                </p>
              </div>

              <div className="card-soft p-5 sm:p-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  {t("adminReservas.metricUpcoming")}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="font-display text-4xl font-extrabold text-foreground">
                    {insights.next7Count}
                  </p>
                  <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {insights.next7Covers} {t("adminReservas.people")}
                  </span>
                </div>
                <div className="mt-3">
                  <MiniBars days={insights.next7} peopleLabel={t("adminReservas.people")} />
                </div>
              </div>

              <div className="card-soft flex flex-col p-5 sm:p-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                  {t("adminReservas.metricDeposit")}
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">
                  {formatKz(metrics.deposit)}
                </p>
                <p className="mt-auto pt-3 text-xs text-muted-foreground">
                  {t("adminReservas.depositCountHint", { count: insights.depositCount })}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TrendChart({
  weeks,
  locale,
  legendTotal,
  legendConfirmed,
}: {
  weeks: { start: Date; total: number; confirmed: number }[];
  locale: Locale;
  legendTotal: string;
  legendConfirmed: string;
}) {
  const W = 320;
  const H = 120;
  const pad = 12;
  const n = weeks.length;
  const maxY = Math.max(1, ...weeks.map((w) => w.total));
  const x = (i: number) => (n === 1 ? 0 : (i / (n - 1)) * W);
  const y = (v: number) => H - pad - (v / maxY) * (H - pad * 2);
  const line = (sel: (w: (typeof weeks)[number]) => number) =>
    weeks
      .map((w, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(sel(w)).toFixed(1)}`)
      .join(" ");
  const totalLine = line((w) => w.total);
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={legendTotal}
      >
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={pad + f * (H - pad * 2)}
            y2={pad + f * (H - pad * 2)}
            className="stroke-border"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={`${totalLine} L${W},${H} L0,${H} Z`} className="fill-primary/10" />
        <path
          d={totalLine}
          className="stroke-primary"
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={line((w) => w.confirmed)}
          className="stroke-success"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="4 3"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-muted-foreground">
        {weeks.map((w, i) => (
          <span key={i} className={i % 2 === 0 ? "opacity-0 sm:opacity-100" : ""}>
            {w.start.toLocaleDateString(BCP47[locale], { day: "2-digit", month: "short" })}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" /> {legendTotal}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-3 border-t-2 border-dashed border-success" /> {legendConfirmed}
        </span>
      </div>
    </div>
  );
}

function StatusBars({
  dist,
  labels,
}: {
  dist: { key: "Pendente" | "Confirmada" | "Recusada"; count: number; pct: number }[];
  labels: Record<string, string>;
}) {
  const tone: Record<string, string> = {
    Pendente: "bg-brand",
    Confirmada: "bg-success",
    Recusada: "bg-destructive",
  };
  return (
    <div className="space-y-4">
      {dist.map((d) => (
        <div key={d.key}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <span className={`h-2 w-2 rounded-full ${tone[d.key]}`} />
              {labels[d.key] ?? d.key}
            </span>
            <span className="tabular-nums text-muted-foreground">
              <span className="font-bold text-foreground">{d.count}</span> · {d.pct}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
            <div
              className={`h-full rounded-full ${tone[d.key]}`}
              style={{ width: `${Math.max(d.pct, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniBars({
  days,
  peopleLabel,
}: {
  days: { label: string; count: number; covers: number }[];
  peopleLabel: string;
}) {
  const max = Math.max(1, ...days.map((d) => d.covers));
  return (
    <div>
      <div className="flex h-16 items-end gap-1.5">
        {days.map((d, i) => (
          <div
            key={i}
            title={`${d.covers} ${peopleLabel}`}
            className={`flex-1 rounded-md ${d.covers > 0 ? "bg-primary/80" : "bg-surface"}`}
            style={{ height: `${d.covers > 0 ? Math.max((d.covers / max) * 100, 12) : 8}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">
        {days.map((d, i) => (
          <span key={i} className="flex-1">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{children}</dd>
    </div>
  );
}
