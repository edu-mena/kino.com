import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Repeat,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminField,
  ADMIN_FILTER_SELECT,
  KpiTile,
  MiniProgress,
  StatBars,
  StatCard,
  StatSection,
  TrendArea,
  TrendBadge,
} from "@/components/admin-stats";
import { AdminPageHeading } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getCustomerNote, setCustomerNote } from "@/data/customer-notes-store";
import type { Reservation } from "@/data/types";
import { useTranslation } from "@/i18n";
import { useCart, type CartOrder } from "@/lib/cart";
import { customerKey } from "@/lib/customer";
import { formatKz } from "@/lib/format";
import { useReservations } from "@/lib/reservations";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { BCP47, last8Weeks, weekStart } from "@/lib/week";

export const Route = createFileRoute("/admin/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Painel Kino.com" }] }),
  component: AdminClientes,
});

type SegmentFilter = "todos" | "recorrentes" | "ocasionais";
type SortKey = "recent" | "reservas" | "pessoas" | "nome";

const statusTone: Record<string, string> = {
  Confirmada: "bg-success/15 text-success",
  Recusada: "bg-destructive/15 text-destructive",
  Pendente: "bg-brand/15 text-brand",
};

const toTime = (raw: string) => new Date(raw.replace(" ", "T")).getTime();

type Customer = {
  key: string;
  name: string;
  phone: string;
  email: string;
  reservations: Reservation[];
  orders: CartOrder[];
};

function groupByCustomer(reservations: Reservation[], orders: CartOrder[]): Customer[] {
  const byKey = new Map<string, Customer>();
  const ensure = (name: string, phone: string, email: string): Customer => {
    const key = customerKey({ email, phone, name });
    let c = byKey.get(key);
    if (!c) {
      c = { key, name, phone, email, reservations: [], orders: [] };
      byKey.set(key, c);
    }
    return c;
  };
  for (const r of reservations) {
    ensure(r.customerName, r.customerPhone, r.customerEmail).reservations.push(r);
  }
  for (const o of orders) {
    if (o.status === "canceled") continue;
    ensure(o.customerName, o.customerPhone, o.customerEmail ?? "").orders.push(o);
  }
  return [...byKey.values()];
}

function AdminClientes() {
  const { restaurant } = useRestaurantAdmin();
  const { reservations } = useReservations();
  const { orders, orderTotal } = useCart();
  const { t, locale } = useTranslation();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [segment, setSegment] = useState<SegmentFilter>("todos");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const statusLabels: Record<string, string> = {
    Pendente: t("adminClientes.statusPending"),
    Confirmada: t("adminClientes.statusConfirmed"),
    Recusada: t("adminClientes.statusRejected"),
  };

  const customers = useMemo(() => {
    if (!restaurant) return [];
    const grouped = groupByCustomer(
      reservations.filter((r) => r.restaurantId === restaurant.id),
      orders.filter((o) => o.restaurantId === restaurant.id),
    );
    return grouped
      .map((c) => {
        const byRecent = [...c.reservations].sort(
          (a, b) => toTime(b.createdAt) - toTime(a.createdAt),
        );
        const covers = c.reservations.reduce((s, r) => s + r.peopleCount, 0);
        const spent = c.orders.reduce((s, o) => s + orderTotal(o), 0);
        const allCreatedAt = [
          ...c.reservations.map((r) => toTime(r.createdAt)),
          ...c.orders.map((o) => new Date(o.createdAt).getTime()),
        ];
        return {
          ...c,
          count: c.reservations.length,
          orderCount: c.orders.length,
          spent,
          covers,
          confirmed: c.reservations.filter((r) => r.status === "Confirmada").length,
          rejected: c.reservations.filter((r) => r.status === "Recusada").length,
          lastDate:
            [...c.reservations.map((r) => r.date), ...c.orders.map((o) => o.createdAt.slice(0, 10))]
              .sort()
              .at(-1) ?? "",
          lastStatus: byRecent[0]?.status ?? "",
          firstCreatedAt: allCreatedAt.length ? Math.min(...allCreatedAt) : Date.now(),
          returning: c.reservations.length + c.orders.length > 1,
        };
      })
      .sort((a, b) => b.firstCreatedAt - a.firstCreatedAt);
  }, [reservations, orders, orderTotal, restaurant]);

  type CustomerAgg = (typeof customers)[number];

  const list = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const rows = customers.filter((c) => {
      if (segment === "recorrentes" && !c.returning) return false;
      if (segment === "ocasionais" && c.returning) return false;
      if (q && ![c.name, c.phone, c.email].some((v) => v.toLowerCase().includes(q))) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      if (sortKey === "reservas") return b.count - a.count;
      if (sortKey === "pessoas") return b.covers - a.covers;
      if (sortKey === "nome") return a.name.localeCompare(b.name);
      return (
        Math.max(...b.reservations.map((r) => toTime(r.createdAt))) -
        Math.max(...a.reservations.map((r) => toTime(r.createdAt)))
      );
    });
  }, [customers, debouncedQuery, segment, sortKey]);

  const active = useMemo(
    () => (activeKey ? (customers.find((c) => c.key === activeKey) ?? null) : null),
    [activeKey, customers],
  );

  useEffect(() => {
    if (active) setNoteDraft(getCustomerNote(active.email || active.key));
  }, [active]);

  const insights = useMemo(() => {
    const weeks = last8Weeks().map((start) => ({ start, count: 0 }));
    const byKey = new Map(weeks.map((w) => [w.start.getTime(), w]));
    for (const c of customers) {
      const w = byKey.get(weekStart(new Date(c.firstCreatedAt)).getTime());
      if (w) w.count += 1;
    }
    const prev = weeks[5]?.count ?? 0;
    const weekDelta = prev > 0 ? Math.round((((weeks[6]?.count ?? 0) - prev) / prev) * 100) : null;

    const total = customers.length || 1;
    const b1 = customers.filter((c) => c.count === 1).length;
    const b2 = customers.filter((c) => c.count === 2).length;
    const b3 = customers.filter((c) => c.count >= 3).length;
    const returning = customers.filter((c) => c.returning).length;
    const covers = customers.reduce((s, c) => s + c.covers, 0);
    const reservationsTotal = customers.reduce((s, c) => s + c.count, 0);
    return {
      points: weeks.map((w) => ({
        label: w.start.toLocaleDateString(BCP47[locale], { day: "2-digit", month: "short" }),
        a: w.count,
      })),
      weekDelta,
      freq: [
        {
          key: "1",
          label: t("adminClientes.freq1"),
          count: b1,
          pct: Math.round((b1 / total) * 100),
          tone: "bg-muted-foreground/40",
        },
        {
          key: "2",
          label: t("adminClientes.freq2"),
          count: b2,
          pct: Math.round((b2 / total) * 100),
          tone: "bg-primary/70",
        },
        {
          key: "3",
          label: t("adminClientes.freq3"),
          count: b3,
          pct: Math.round((b3 / total) * 100),
          tone: "bg-primary",
        },
      ],
      total: customers.length,
      returning,
      returningPct: Math.round((returning / total) * 100),
      covers,
      avgParty: reservationsTotal ? Math.round((covers / reservationsTotal) * 10) / 10 : 0,
    };
  }, [customers, locale, t]);

  if (!restaurant) return null;

  const saveNote = (c: CustomerAgg) => {
    setCustomerNote(c.email || c.key, noteDraft);
    toast.success(t("adminClientes.noteSavedToast"));
  };

  const fmtDate = (d: string) =>
    d
      ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString(BCP47[locale], {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="pb-16">
      <AdminPageHeading eyebrow={t("adminClientes.eyebrow")} title={t("adminClientes.title")} />

      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
        {customers.length === 0 ? (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("adminClientes.emptyNoCustomers")}</p>
          </div>
        ) : (
          <>
            {/* Pesquisa + filtros */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 transition-colors focus-within:border-brand has-[:focus]:text-brand sm:max-w-xs">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("adminClientes.searchPlaceholder")}
                  className="w-full min-w-0 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>

              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value as SegmentFilter)}
                className={ADMIN_FILTER_SELECT}
              >
                <option value="todos">{t("adminClientes.segmentAll")}</option>
                <option value="recorrentes">{t("adminClientes.segmentReturning")}</option>
                <option value="ocasionais">{t("adminClientes.segmentOccasional")}</option>
              </select>

              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className={ADMIN_FILTER_SELECT}
              >
                <option value="recent">{t("adminClientes.sortRecent")}</option>
                <option value="reservas">{t("adminClientes.sortMostReservations")}</option>
                <option value="pessoas">{t("adminClientes.sortMostPeople")}</option>
                <option value="nome">{t("adminClientes.sortName")}</option>
              </select>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              {/* Lista */}
              <div className={`min-w-0 ${activeKey ? "hidden lg:block" : "block"}`}>
                <p className="px-1 text-xs font-medium text-muted-foreground">
                  {t("adminClientes.resultsCount", { count: list.length })}
                </p>

                <div className="card-soft mt-2 overflow-hidden p-[5px]">
                  <div className="mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] gap-3 rounded-[20rem] bg-primary px-6 py-4 text-sm font-bold uppercase tracking-wide text-white">
                    <span>{t("adminClientes.colCustomer")}</span>
                    <span className="text-right">{t("adminClientes.colReservations")}</span>
                    <span className="pl-3 text-right">{t("adminClientes.colLast")}</span>
                  </div>

                  <div>
                    {list.map((c, i) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setActiveKey(c.key)}
                        className={`mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[20rem] px-5 py-2.5 text-left transition-colors last:mb-0 ${
                          activeKey === c.key
                            ? "bg-primary/10"
                            : i % 2 === 1
                              ? "bg-surface/70 hover:bg-primary/5"
                              : "hover:bg-primary/5"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {c.name}
                            </span>
                            {c.returning && (
                              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                {t("adminClientes.badgeReturning")}
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {c.phone}
                            {c.email ? ` · ${c.email}` : ""}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 text-right text-xs font-semibold text-foreground">
                          <CalendarCheck className="h-3 w-3 shrink-0 text-muted-foreground" />
                          {c.count}
                        </span>
                        <span className="flex items-center gap-1 pl-3">
                          {c.lastStatus && (
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                statusTone[c.lastStatus] ?? "bg-surface text-muted-foreground"
                              }`}
                            >
                              {statusLabels[c.lastStatus] ?? c.lastStatus}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </span>
                      </button>
                    ))}
                    {list.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        {t("adminClientes.emptyNoResults")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Detalhe + nota */}
              <div className={`min-w-0 ${activeKey ? "block" : "hidden lg:block"}`}>
                <div className="card-soft sticky top-24 p-6 lg:top-6">
                  {active ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveKey(null)}
                        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary lg:hidden"
                      >
                        <ChevronLeft className="h-4 w-4" /> {t("common.back")}
                      </button>

                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="font-display text-lg font-bold text-primary">
                            {active.name}
                          </h2>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {t("adminClientes.customerSince", {
                              date: fmtDate(new Date(active.firstCreatedAt).toISOString()),
                            })}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                            active.returning
                              ? "bg-primary/10 text-primary"
                              : "bg-surface text-muted-foreground"
                          }`}
                        >
                          {active.returning
                            ? t("adminClientes.badgeReturning")
                            : t("adminClientes.badgeNew")}
                        </span>
                      </div>

                      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-5 text-sm">
                        <AdminField label={t("adminClientes.detailContact")}>
                          <a
                            href={`tel:${active.phone.replace(/\s/g, "")}`}
                            className="flex items-center gap-1.5 text-foreground hover:text-primary"
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                            {active.phone}
                          </a>
                          {active.email && (
                            <a
                              href={`mailto:${active.email}`}
                              className="mt-1 flex items-center gap-1.5 text-foreground hover:text-primary"
                            >
                              <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                              <span className="truncate">{active.email}</span>
                            </a>
                          )}
                        </AdminField>
                        <AdminField label={t("adminClientes.detailLastVisit")}>
                          {fmtDate(active.lastDate)}
                        </AdminField>
                        <AdminField label={t("adminClientes.detailReservations")}>
                          {active.count} · <span className="text-success">{active.confirmed}</span>{" "}
                          {t("adminClientes.statusConfirmed").toLowerCase()}
                        </AdminField>
                        <AdminField label={t("adminClientes.detailPeople")}>
                          {active.covers} {t("adminClientes.people")}
                        </AdminField>
                        <AdminField label={t("adminClientes.detailOrders")}>
                          {active.orderCount} · {formatKz(active.spent)}
                        </AdminField>
                      </dl>

                      {/* Histórico */}
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {t("adminClientes.historyTitle")}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {[
                            ...active.reservations.map((r) => ({
                              id: r.id,
                              at: toTime(r.createdAt),
                              label: `${r.date} · ${r.time} · ${r.peopleCount} ${t("adminClientes.people")}`,
                              status: r.status,
                              badge: statusLabels[r.status] ?? r.status,
                              tone: statusTone[r.status] ?? "bg-card text-muted-foreground",
                            })),
                            ...active.orders.map((o) => ({
                              id: o.id,
                              at: new Date(o.createdAt).getTime(),
                              label: `${o.createdAt.slice(0, 10)} · ${t("adminClientes.orderLine", {
                                value: formatKz(orderTotal(o)),
                              })}`,
                              status: o.status,
                              badge: t(`orderStatus.${o.status}`),
                              tone: "bg-primary/10 text-primary",
                            })),
                          ]
                            .sort((a, b) => b.at - a.at)
                            .map((row) => (
                              <li
                                key={row.id}
                                className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 text-xs"
                              >
                                <span className="min-w-0 truncate text-foreground">
                                  {row.label}
                                </span>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${row.tone}`}
                                >
                                  {row.badge}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>

                      {/* Nota */}
                      <div className="mt-4 space-y-1.5 border-t border-border pt-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {t("adminClientes.notesLabel")}
                        </p>
                        <Textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder={t("adminClientes.notesPlaceholder")}
                          className="rounded-xl"
                        />
                        <Button onClick={() => saveNote(active)} size="sm" className="rounded-xl">
                          {t("adminClientes.saveNote")}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="grid place-items-center gap-3 py-12 text-center">
                      <Users className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t("adminClientes.chooseHint")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <StatSection title={t("adminClientes.statsTitle")} hint={t("adminClientes.statsHint")}>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <StatCard
                  wide
                  title={t("adminClientes.chartNewTitle")}
                  subtitle={t("adminClientes.chartNewSubtitle")}
                  right={
                    <TrendBadge delta={insights.weekDelta} label={t("adminClientes.vsPrevWeek")} />
                  }
                >
                  <TrendArea points={insights.points} legendA={t("adminClientes.legendNew")} />
                </StatCard>

                <StatCard
                  title={t("adminClientes.freqTitle")}
                  subtitle={t("adminClientes.resultsCount", { count: customers.length })}
                >
                  <StatBars rows={insights.freq} />
                </StatCard>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <KpiTile
                  icon={Users}
                  tone="primary"
                  label={t("adminClientes.kpiTotal")}
                  value={String(insights.total)}
                />
                <KpiTile
                  icon={Repeat}
                  tone="success"
                  label={t("adminClientes.kpiReturning")}
                  value={String(insights.returning)}
                  hint={t("adminClientes.kpiReturningHint", { pct: insights.returningPct })}
                >
                  <MiniProgress pct={insights.returningPct} />
                </KpiTile>
                <KpiTile
                  icon={CalendarCheck}
                  tone="muted"
                  big={false}
                  label={t("adminClientes.kpiPeople")}
                  value={String(insights.covers)}
                  hint={t("adminClientes.kpiPeopleHint", { avg: insights.avgParty })}
                />
              </div>
            </StatSection>
          </>
        )}
      </div>
    </div>
  );
}
