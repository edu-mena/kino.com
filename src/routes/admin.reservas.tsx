import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  List,
  Mail,
  Phone,
  Search,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeading, RestaurantGate } from "@/components/admin-shell";
import { ReservationFloorPlan } from "@/components/reservation-floor-plan";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTranslation, type Locale } from "@/i18n";
import { formatKz } from "@/lib/format";
import { useReservations } from "@/lib/reservations";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useTables } from "@/lib/tables";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export const Route = createFileRoute("/admin/reservas")({
  head: () => ({ meta: [{ title: "Reservas — Painel Kino.com" }] }),
  component: () => (
    <RestaurantGate>
      <AdminReservas />
    </RestaurantGate>
  ),
});

const BCP47: Record<Locale, string> = { pt: "pt-PT", en: "en-GB", fr: "fr-FR" };

type StatusFilter = "todos" | "Pendente" | "Confirmada" | "Recusada";
type TimeFilter = "upcoming" | "today" | "past" | "all";
type SortKey = "prioridade" | "recent";

/** Janela de ocupação por omissão (min) quando o restaurante não definiu
 * `reservationSlotMinutes` em `/admin/mesas`. */
const DEFAULT_SLOT_MIN = 120;
/** Estados que ocupam a sala (contam para a capacidade). */
const OCCUPYING = new Set(["Pendente", "Confirmada"]);
const timeToMin = (t: string) => {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
};
const statusTier = (s: string) =>
  s === "Pendente" ? 0 : s === "Confirmada" ? 1 : s === "Recusada" ? 2 : 3;

const statusTone: Record<string, string> = {
  Confirmada: "bg-success/15 text-success",
  Recusada: "bg-destructive/15 text-destructive",
  Cancelada: "bg-muted-foreground/15 text-muted-foreground",
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
  const { reservations, updateReservationStatus, assignTable } = useReservations();
  const { tablesByRestaurant, totalSeats: totalSeatsOf, tableCount: tableCountOf } = useTables();
  const { t, locale } = useTranslation();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");
  const [sortKey, setSortKey] = useState<SortKey>("prioridade");
  const [onlyConflicts, setOnlyConflicts] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  type NavTab = "reservas" | "dia" | "stats";
  const [navTab, setNavTab] = useState<NavTab>("reservas");

  // Troca lista <-> dia <-> estatísticas com deslize horizontal — mesma
  // transição de página do site convidado, restrita ao
  // `view-transition-name: admin-panel` (ver regras `admin-tab` em styles.css).
  const NAV_ORDER: NavTab[] = ["reservas", "dia", "stats"];
  const switchTab = (next: NavTab) => {
    if (next === navTab) return;
    const back = NAV_ORDER.indexOf(next) < NAV_ORDER.indexOf(navTab);
    const update = () => {
      setNavTab(next);
      window.scrollTo({ top: 0, left: 0 });
    };
    const startViewTransition = (
      document as Document & {
        startViewTransition?: (arg: { update: () => void; types?: string[] }) => unknown;
      }
    ).startViewTransition;
    if (
      typeof startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      startViewTransition.call(document, {
        update,
        types: back ? ["admin-tab", "back"] : ["admin-tab"],
      });
    } else {
      update();
    }
  };

  const statusLabels: Record<string, string> = {
    Pendente: t("adminReservas.statusPending"),
    Confirmada: t("adminReservas.statusConfirmed"),
    Recusada: t("adminReservas.statusRejected"),
    Cancelada: t("adminReservas.statusCanceled"),
  };

  const mine = useMemo(
    () => (restaurant ? reservations.filter((r) => r.restaurantId === restaurant.id) : []),
    [reservations, restaurant],
  );

  const tables = useMemo(
    () => (restaurant ? tablesByRestaurant(restaurant.id) : []),
    [restaurant, tablesByRestaurant],
  );
  const totalSeats = restaurant ? totalSeatsOf(restaurant.id) : 0;
  const tableCount = restaurant ? tableCountOf(restaurant.id) : 0;
  const slotMin = restaurant?.reservationSlotMinutes ?? DEFAULT_SLOT_MIN;
  const tableName = (id?: string) => tables.find((tbl) => tbl.id === id)?.name ?? "";

  // "Hoje" = data real do dispositivo. Uma reserva com data anterior a hoje
  // está no passado (fica "Inativa" e sem ações), independentemente do estado.
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

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

  const isPast = (r: (typeof mine)[number]) => dayOf(r.date) < todayStr;

  /** Estado a mostrar: reservas com data já passada aparecem como "Inativa"
   * (cinza), independentemente do estado real. */
  const displayStatus = (r: (typeof mine)[number]) =>
    isPast(r)
      ? {
          label: t("adminReservas.statusInactive"),
          tone: "bg-muted-foreground/15 text-muted-foreground",
        }
      : {
          label: statusLabels[r.status] ?? r.status,
          tone: statusTone[r.status] ?? "bg-surface text-muted-foreground",
        };

  const overlaps = (a: (typeof mine)[number], b: (typeof mine)[number]) =>
    a.date === b.date && Math.abs(timeToMin(a.time) - timeToMin(b.time)) < slotMin;

  // Sobre-reservas ("conflitos"): agrupa as reservas futuras que ocupam a
  // sala (Pendente/Confirmada) por janela de tempo sobreposta e marca as
  // janelas onde a procura excede a capacidade OU há mesas repetidas.
  // Dois clientes à mesma hora só entram em conflito se a sala não os
  // comportar. `conflicts`: id -> ids na mesma janela problemática.
  const { conflicts, conflictClusters } = useMemo(() => {
    const relevant = mine.filter((r) => OCCUPYING.has(r.status) && dayOf(r.date) >= todayStr);
    const seen = new Set<string>();
    const problemGroups: (typeof mine)[] = [];
    for (const start of relevant) {
      if (seen.has(start.id)) continue;
      const group: typeof mine = [];
      const stack = [start];
      while (stack.length) {
        const r = stack.pop()!;
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        group.push(r);
        for (const other of relevant) {
          if (!seen.has(other.id) && overlaps(r, other)) stack.push(other);
        }
      }
      const seats = group.reduce((s, r) => s + r.peopleCount, 0);
      const usedTables = group.map((r) => r.tableId).filter(Boolean) as string[];
      const tableClash = new Set(usedTables).size !== usedTables.length;
      const overCapacity =
        (totalSeats > 0 && seats > totalSeats) || (tableCount > 0 && group.length > tableCount);
      if (tableClash || overCapacity) {
        group.sort((a, b) => a.time.localeCompare(b.time));
        problemGroups.push(group);
      }
    }
    const map = new Map<string, string[]>();
    for (const g of problemGroups) {
      for (const r of g)
        map.set(
          r.id,
          g.filter((x) => x.id !== r.id).map((x) => x.id),
        );
    }
    problemGroups.sort(
      (a, b) => toTime(`${a[0]!.date}T${a[0]!.time}`) - toTime(`${b[0]!.date}T${b[0]!.time}`),
    );
    return { conflicts: map, conflictClusters: problemGroups };
  }, [mine, todayStr, slotMin, totalSeats, tableCount]);

  /** Ocupação da janela de uma reserva: quantas reservas, quantos lugares
   * pedidos, e se há choque de mesa. Base do bloco no card de detalhe. */
  const occupancyFor = (r: (typeof mine)[number]) => {
    const windowSet = mine.filter(
      (x) =>
        OCCUPYING.has(x.status) && dayOf(x.date) >= todayStr && (x.id === r.id || overlaps(r, x)),
    );
    const seats = windowSet.reduce((s, x) => s + x.peopleCount, 0);
    const used = windowSet.map((x) => x.tableId).filter(Boolean) as string[];
    return {
      parties: windowSet.length,
      seats,
      seatsOver: totalSeats > 0 && seats > totalSeats,
      partiesOver: tableCount > 0 && windowSet.length > tableCount,
      tableClash: new Set(used).size !== used.length,
    };
  };

  /** Mesa livre mais pequena que caiba em `pax` na janela de `r`. */
  const suggestTable = (r: (typeof mine)[number]) => {
    const taken = new Set(
      mine
        .filter(
          (x) =>
            x.id !== r.id &&
            OCCUPYING.has(x.status) &&
            dayOf(x.date) >= todayStr &&
            overlaps(r, x) &&
            x.tableId,
        )
        .map((x) => x.tableId),
    );
    return (
      tables
        .filter((tbl) => !taken.has(tbl.id) && tbl.seats >= r.peopleCount)
        .sort((a, b) => a.seats - b.seats)[0]?.id ?? ""
    );
  };

  /** Pendentes dentro de uma janela problemática — o caso mais urgente. */
  const pendingConflictCount = useMemo(
    () => mine.filter((r) => r.status === "Pendente" && conflicts.has(r.id)).length,
    [mine, conflicts],
  );

  const list = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const rows = mine.filter((r) => {
      if (statusFilter !== "todos" && r.status !== statusFilter) return false;
      if (onlyConflicts && !conflicts.has(r.id)) return false;
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
    return rows.sort((a, b) => {
      if (sortKey === "recent") return toTime(b.createdAt) - toTime(a.createdAt);
      // "prioridade": Pendentes no topo → Confirmadas por data reservada →
      // Recusadas → Inativas (data já passada) no fim, mais recente primeiro.
      const ta = dayOf(a.date) < todayStr ? 3 : statusTier(a.status);
      const tb = dayOf(b.date) < todayStr ? 3 : statusTier(b.status);
      if (ta !== tb) return ta - tb;
      const da = toTime(`${a.date}T${a.time}`);
      const db = toTime(`${b.date}T${b.time}`);
      return ta >= 2 ? db - da : da - db;
    });
  }, [mine, debouncedQuery, statusFilter, onlyConflicts, conflicts, timeFilter, sortKey, todayStr]);

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
      <AdminPageHeading
        eyebrow={t("adminReservas.eyebrow")}
        title={t("adminReservas.title")}
        action={
          mine.length > 0 ? (
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
              {(
                [
                  ["reservas", List],
                  ["dia", CalendarCheck],
                  ["stats", BarChart3],
                ] as const
              ).map(([tab, Icon]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchTab(tab)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition-colors ${
                    navTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(`adminReservas.tab.${tab}`)}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
        {mine.length === 0 ? (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <CalendarCheck className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("adminReservas.emptyText")}</p>
          </div>
        ) : (
          <div style={{ viewTransitionName: "admin-panel" }}>
            {navTab === "reservas" ? (
              <>
                {/* Pesquisa + filtros */}
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
                    <option value="prioridade">{t("adminReservas.sortPriority")}</option>
                    <option value="recent">{t("adminReservas.sortRecent")}</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setOnlyConflicts((v) => !v)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      onlyConflicts
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-border bg-card text-muted-foreground hover:border-brand hover:text-brand"
                    }`}
                  >
                    <TriangleAlert className="h-3.5 w-3.5" />
                    {t("adminReservas.onlyConflicts")}
                    {conflicts.size > 0 && (
                      <span className="tabular-nums opacity-70">({conflicts.size})</span>
                    )}
                  </button>
                </div>

                {conflicts.size > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand/40 bg-brand/5 p-3 text-xs">
                    <TriangleAlert className="h-4 w-4 shrink-0 text-brand" />
                    <span className="min-w-0 flex-1 text-foreground">
                      {pendingConflictCount > 0
                        ? t("adminReservas.conflictBanner", { count: pendingConflictCount })
                        : t("adminReservas.conflictBannerSoft", { count: conflicts.size })}
                    </span>
                    <button
                      type="button"
                      onClick={() => setConflictOpen(true)}
                      className="shrink-0 rounded-lg bg-brand px-3 py-1.5 font-bold text-brand-foreground transition-opacity hover:opacity-90"
                    >
                      {t("adminReservas.resolveConflicts")}
                    </button>
                  </div>
                )}

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

                      {/* ~5 registos visíveis, resto com scroll vertical */}
                      <div className="max-h-[21rem] overflow-y-auto">
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
                              <span className="block font-medium capitalize">
                                {fmtDate(r.date)}
                              </span>
                              <span className="text-muted-foreground">{r.time}</span>
                            </span>
                            <span className="flex items-center gap-1 pl-3">
                              {conflicts.has(r.id) && (
                                <TriangleAlert
                                  className="h-3.5 w-3.5 shrink-0 text-brand"
                                  aria-label={t("adminReservas.conflictBadge")}
                                />
                              )}
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${displayStatus(r).tone}`}
                              >
                                {displayStatus(r).label}
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
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${displayStatus(active).tone}`}
                            >
                              {displayStatus(active).label}
                            </span>
                          </div>

                          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-5 text-sm">
                            <Field label={t("adminReservas.detailWhen")}>
                              <span className="capitalize">{fmtDate(active.date)}</span> ·{" "}
                              {active.time}
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
                                    confirmed: customerHistory.filter(
                                      (r) => r.status === "Confirmada",
                                    ).length,
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
                                        <span className="capitalize">{fmtDate(r.date)}</span> ·{" "}
                                        {r.time} · {r.peopleCount} {t("adminReservas.people")}
                                        {r.id === active.id && (
                                          <span className="ml-1 text-primary">
                                            ({t("adminReservas.historyCurrent")})
                                          </span>
                                        )}
                                      </span>
                                      <span
                                        className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${displayStatus(r).tone}`}
                                      >
                                        {displayStatus(r).label}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>

                          {/* Ocupação da janela + mesa atribuída */}
                          {!isPast(active) && OCCUPYING.has(active.status) && (
                            <div className="mt-4 rounded-xl border border-border bg-surface p-3">
                              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                {t("adminReservas.occupancyTitle")}
                              </p>
                              {(() => {
                                const occ = occupancyFor(active);
                                return (
                                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground">
                                    <span>
                                      {t("adminReservas.occupancyParties", { count: occ.parties })}
                                    </span>
                                    <span
                                      className={
                                        occ.seatsOver
                                          ? "font-bold text-destructive"
                                          : "text-muted-foreground"
                                      }
                                    >
                                      {t("adminReservas.occupancySeats", {
                                        used: occ.seats,
                                        total: totalSeats || "—",
                                      })}
                                    </span>
                                    {occ.partiesOver && (
                                      <span className="font-bold text-destructive">
                                        {t("adminReservas.occupancyOverTables", {
                                          total: tableCount,
                                        })}
                                      </span>
                                    )}
                                    {occ.tableClash && (
                                      <span className="font-bold text-destructive">
                                        {t("adminReservas.occupancyTableClash")}
                                      </span>
                                    )}
                                  </p>
                                );
                              })()}
                              {tables.length > 0 && (
                                <label className="mt-3 block">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {t("adminReservas.tableLabel")}
                                  </span>
                                  <select
                                    value={active.tableId ?? ""}
                                    onChange={(e) =>
                                      assignTable(active.id, e.target.value || undefined)
                                    }
                                    className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-brand"
                                  >
                                    <option value="">{t("adminReservas.tableNone")}</option>
                                    {tables.map((tbl) => (
                                      <option key={tbl.id} value={tbl.id}>
                                        {tbl.name} ·{" "}
                                        {t("adminReservas.tableSeats", { count: tbl.seats })}
                                      </option>
                                    ))}
                                  </select>
                                  {!active.tableId && suggestTable(active) && (
                                    <button
                                      type="button"
                                      onClick={() => assignTable(active.id, suggestTable(active))}
                                      className="mt-1.5 text-xs font-semibold text-primary hover:underline"
                                    >
                                      {t("adminReservas.tableSuggest", {
                                        name: tableName(suggestTable(active)),
                                      })}
                                    </button>
                                  )}
                                </label>
                              )}
                            </div>
                          )}

                          {/* Sobre-reservas nesta janela */}
                          {(conflicts.get(active.id) ?? []).length > 0 && (
                            <div className="mt-4 rounded-xl border border-brand/40 bg-brand/5 p-3">
                              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand">
                                <TriangleAlert className="h-3.5 w-3.5" />
                                {t("adminReservas.conflictTitle")}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t("adminReservas.conflictHint")}
                              </p>
                              <ul className="mt-2 space-y-1.5">
                                {(conflicts.get(active.id) ?? []).map((cid) => {
                                  const c = mine.find((x) => x.id === cid);
                                  if (!c) return null;
                                  return (
                                    <li key={cid}>
                                      <button
                                        type="button"
                                        onClick={() => setActiveId(cid)}
                                        className="flex w-full items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 text-left text-xs transition-colors hover:bg-surface"
                                      >
                                        <span className="min-w-0 truncate text-foreground">
                                          {c.customerName} · {c.time} · {c.peopleCount}{" "}
                                          {t("adminReservas.people")}
                                        </span>
                                        <span
                                          className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${displayStatus(c).tone}`}
                                        >
                                          {displayStatus(c).label}
                                        </span>
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}

                          {/* Ações — indisponíveis quando inativa (data passada) ou cancelada pelo cliente */}
                          {isPast(active) || active.status === "Cancelada" ? (
                            <p className="mt-5 flex items-center gap-1.5 border-t border-border pt-5 text-xs text-muted-foreground">
                              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                              {active.status === "Cancelada"
                                ? t("adminReservas.canceledNote")
                                : t("adminReservas.inactiveNote")}
                            </p>
                          ) : (
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
                                    onClick={() =>
                                      respond(active.id, "Confirmada", "confirmedToast")
                                    }
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
                          )}
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
            ) : navTab === "dia" ? (
              <ReservationFloorPlan
                reservations={mine}
                tables={tables}
                slotMin={slotMin}
                totalSeats={totalSeats}
                onAssign={assignTable}
                onConfirm={(id) => respond(id, "Confirmada", "confirmedToast")}
              />
            ) : (
              <section>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h2 className="font-display text-lg font-bold text-foreground">
                    {t("adminReservas.statsTitle")}
                  </h2>
                  <p className="text-xs text-muted-foreground">{t("adminReservas.statsHint")}</p>
                </div>

                {conflicts.size > 0 && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand/40 bg-brand/5 p-3 text-xs">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <span className="text-foreground">
                      {t("adminReservas.conflictStat", {
                        count: conflicts.size,
                        pending: pendingConflictCount,
                      })}
                    </span>
                  </div>
                )}

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
        )}
      </div>

      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <TriangleAlert className="h-4 w-4 text-brand" />
            {t("adminReservas.conflictDialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("adminReservas.conflictDialogDescription")}</DialogDescription>

          <div className="mt-4 space-y-4">
            {conflictClusters.length === 0 && (
              <p className="rounded-xl bg-surface p-4 text-center text-sm text-muted-foreground">
                {t("adminReservas.conflictNone")}
              </p>
            )}
            {conflictClusters.map((group) => (
              <div
                key={group.map((r) => r.id).join("+")}
                className="rounded-xl border border-brand/40 bg-brand/5 p-3"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <span className="capitalize">{fmtDate(group[0]!.date)}</span> · {group[0]!.time} ·{" "}
                  {t("adminReservas.occupancySeats", {
                    used: group.reduce((s, r) => s + r.peopleCount, 0),
                    total: totalSeats || "—",
                  })}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {group.map((r) => (
                    <li key={r.id} className="rounded-lg bg-card px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveId(r.id);
                            setNavTab("reservas");
                            setConflictOpen(false);
                          }}
                          className="min-w-0 truncate text-left text-xs font-semibold text-foreground hover:text-primary"
                        >
                          {r.time} · {r.customerName} · {r.peopleCount} {t("adminReservas.people")}
                        </button>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${displayStatus(r).tone}`}
                        >
                          {displayStatus(r).label}
                        </span>
                      </div>
                      {r.status !== "Recusada" && (
                        <div className="mt-1.5 flex gap-1.5">
                          {r.status === "Pendente" && (
                            <button
                              type="button"
                              onClick={() => respond(r.id, "Confirmada", "confirmedToast")}
                              className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
                            >
                              {t("adminReservas.confirm")}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              respond(
                                r.id,
                                "Recusada",
                                r.status === "Confirmada" ? "canceledToast" : "rejectedToast",
                              )
                            }
                            className="rounded-lg border border-dashed border-destructive/50 px-2.5 py-1 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/5"
                          >
                            {r.status === "Confirmada"
                              ? t("adminReservas.cancel")
                              : t("adminReservas.reject")}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
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
