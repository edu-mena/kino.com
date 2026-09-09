import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Bike,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  Search,
  TrendingUp,
  TriangleAlert,
  Trash2,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminField,
  ADMIN_FILTER_SELECT,
  KpiTile,
  MiniBars,
  StatBars,
  StatCard,
  StatSection,
  TrendArea,
  TrendBadge,
} from "@/components/admin-stats";
import { AdminPageHeading, RestaurantGate } from "@/components/admin-shell";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getMenuItem,
  getRestaurantPaymentMethodIds,
  orderModeRequiresCaution,
} from "@/data/helpers";
import { useTranslation, type Locale } from "@/i18n";
import {
  lineCustomizations,
  lineUnitPrice,
  useCart,
  type CartOrder,
  type CartOrderStatus,
} from "@/lib/cart";
import { getPaymentMethod } from "@/lib/mock-data";
import { useCouriers, type Courier, type CourierStatus, type CourierVehicle } from "@/lib/couriers";
import {
  assessDelivery,
  DELIVERY_RADIUS_KM,
  minutesSince,
  orderDistanceKm,
  PENDING_SLA_MIN,
  type DeliveryLevel,
} from "@/lib/delivery-eval";
import { formatKz } from "@/lib/format";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useDeliveryPolicy } from "@/lib/use-platform-settings";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Painel Kino.com" }] }),
  component: () => (
    <RestaurantGate>
      <AdminPedidos />
    </RestaurantGate>
  ),
});

const BCP47: Record<Locale, string> = { pt: "pt-PT", en: "en-GB", fr: "fr-FR" };
const STATUS_ORDER: CartOrderStatus[] = [
  "pending",
  "accepted",
  "onTheWay",
  "ready",
  "delivered",
  "completed",
  "rejected",
  "canceled",
];

type StatusFilter = "todos" | CartOrderStatus;
type SortKey = "priority" | "recent" | "old" | "valhi" | "vallo";

/** Ordem operacional: novos primeiro, entregues/recusados no fim. */
const statusRank: Record<CartOrderStatus, number> = {
  pending: 0,
  accepted: 1,
  onTheWay: 2,
  ready: 2,
  delivered: 3,
  completed: 3,
  rejected: 4,
  canceled: 5,
};

const courierStatusTone: Record<CourierStatus, string> = {
  disponivel: "bg-success/15 text-success",
  em_entrega: "bg-primary/15 text-primary",
  offline: "bg-muted-foreground/15 text-muted-foreground",
};

const deliveryChipTone: Record<DeliveryLevel, string> = {
  ok: "bg-surface text-muted-foreground",
  far: "bg-brand/15 text-brand",
  outOfRange: "bg-destructive/15 font-bold text-destructive",
};

const firstName = (n: string) => n.split(" ")[0] ?? n;

const COURIER_VEHICLES: CourierVehicle[] = ["moto", "bicicleta", "carro"];
type CourierDraft = { name: string; phone: string; vehicle: CourierVehicle; zone: string };
const emptyCourierDraft: CourierDraft = { name: "", phone: "", vehicle: "moto", zone: "Luanda" };

const statusTone: Record<CartOrderStatus, string> = {
  pending: "bg-brand/15 text-brand",
  accepted: "bg-primary/15 text-primary",
  onTheWay: "bg-primary/15 text-primary",
  ready: "bg-primary/15 text-primary",
  delivered: "bg-success/15 text-success",
  completed: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  canceled: "bg-muted-foreground/15 text-muted-foreground",
};
const statusBarTone: Record<CartOrderStatus, string> = {
  pending: "bg-brand",
  accepted: "bg-primary",
  onTheWay: "bg-primary/70",
  ready: "bg-primary/70",
  delivered: "bg-success",
  completed: "bg-success",
  rejected: "bg-destructive",
  canceled: "bg-muted-foreground/50",
};

const toTime = (raw: string) => new Date(raw).getTime();
const dayKey = (raw: string) => new Date(raw).toISOString().slice(0, 10);

/** "order-1727890123456" -> "123456"; "order-b1" -> "B1". */
function orderShortId(id: string) {
  const tail = id.split("-").pop() ?? id;
  return (tail.length > 6 ? tail.slice(-6) : tail).toUpperCase();
}

function weekStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function AdminPedidos() {
  const { restaurant } = useRestaurantAdmin();
  const deliveryPolicy = useDeliveryPolicy();
  const { orders, orderTotal, orderSubtotal, orderDiscount, updateOrderStatus, acceptOrder } =
    useCart();
  const {
    couriersByRestaurant,
    availableByRestaurant,
    courierForOrder,
    assign,
    releaseOrder,
    setStatus,
    addCourier,
    updateCourier,
    removeCourier,
  } = useCouriers();
  const { t, locale } = useTranslation();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [navTab, setNavTab] = useState<"pedidos" | "stats">("pedidos");
  const [courierPick, setCourierPick] = useState("");
  const [confirmFarId, setConfirmFarId] = useState<string | null>(null);
  const [acceptFor, setAcceptFor] = useState<CartOrder | null>(null);
  const [payChoice, setPayChoice] = useState("");
  const [couriersOpen, setCouriersOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [courierDraft, setCourierDraft] = useState<CourierDraft>(emptyCourierDraft);
  const [courierFormOpen, setCourierFormOpen] = useState(false);

  // Ao trocar de pedido, limpa a escolha de estafeta e o passo de
  // confirmação de "fora do raio" — nunca herdar decisões do pedido anterior.
  useEffect(() => {
    setCourierPick("");
    setConfirmFarId(null);
    setAcceptFor(null);
  }, [activeId]);

  // Troca de aba com deslize horizontal — reaproveita a transição de página
  // do site convidado (keyframes `kino-page-*` em styles.css), aqui limitada
  // ao painel via `view-transition-name: admin-panel` e ao tipo `admin-tab`.
  const switchTab = (next: "pedidos" | "stats") => {
    if (next === navTab) return;
    const back = next === "pedidos";
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

  const statusLabels = useMemo<Record<CartOrderStatus, string>>(
    () => ({
      pending: t("adminPedidos.statusPending"),
      accepted: t("adminPedidos.statusAccepted"),
      onTheWay: t("adminPedidos.statusOnTheWay"),
      ready: t("orderStatus.ready"),
      delivered: t("adminPedidos.statusDelivered"),
      completed: t("orderStatus.completed"),
      rejected: t("adminPedidos.statusRejected"),
      canceled: t("adminPedidos.statusCanceled"),
    }),
    [t],
  );

  const vehicleLabels = useMemo<Record<CourierVehicle, string>>(
    () => ({
      moto: t("adminPedidos.vehMoto"),
      bicicleta: t("adminPedidos.vehBike"),
      carro: t("adminPedidos.vehCar"),
    }),
    [t],
  );
  const courierStatusLabels = useMemo<Record<CourierStatus, string>>(
    () => ({
      disponivel: t("adminPedidos.courierFree"),
      em_entrega: t("adminPedidos.courierBusy"),
      offline: t("adminPedidos.courierOff"),
    }),
    [t],
  );

  const mine = useMemo(
    () => (restaurant ? orders.filter((o) => o.restaurantId === restaurant.id) : []),
    [orders, restaurant],
  );

  const statusCounts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      todos: mine.length,
      pending: 0,
      accepted: 0,
      onTheWay: 0,
      ready: 0,
      delivered: 0,
      completed: 0,
      rejected: 0,
      canceled: 0,
    };
    for (const o of mine) c[o.status] += 1;
    return c;
  }, [mine]);

  const itemCount = (o: CartOrder) => o.lines.reduce((n, l) => n + l.qty, 0);

  const list = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const rows = mine.filter((o) => {
      if (statusFilter !== "todos" && o.status !== statusFilter) return false;
      if (q) {
        const hay = [
          o.id,
          o.customerName,
          o.customerPhone,
          o.customerEmail ?? "",
          o.deliveryAddress?.label ?? "",
          o.deliveryAddress?.line1 ?? "",
          o.deliveryAddress?.line2 ?? "",
          ...o.lines.map((l) => getMenuItem(l.menuItemId)?.name ?? ""),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return rows.sort((a, b) => {
      if (sortKey === "old") return toTime(a.createdAt) - toTime(b.createdAt);
      if (sortKey === "valhi") return orderTotal(b) - orderTotal(a);
      if (sortKey === "vallo") return orderTotal(a) - orderTotal(b);
      if (sortKey === "recent") return toTime(b.createdAt) - toTime(a.createdAt);
      // priority (padrão): estado operacional; dentro do mesmo estado, os que
      // esperam há mais tempo primeiro (pendentes/em curso), entregues/recusados
      // pelos mais recentes.
      const ra = statusRank[a.status];
      const rb = statusRank[b.status];
      if (ra !== rb) return ra - rb;
      return ra <= 2
        ? toTime(a.createdAt) - toTime(b.createdAt)
        : toTime(b.createdAt) - toTime(a.createdAt);
    });
  }, [mine, debouncedQuery, statusFilter, sortKey, orderTotal]);

  const active = useMemo(
    () => (activeId ? (mine.find((o) => o.id === activeId) ?? null) : null),
    [activeId, mine],
  );

  const insights = useMemo(() => {
    const now = new Date();
    const anchor = weekStart(now);
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(anchor);
      start.setDate(start.getDate() - (7 - i) * 7);
      return { key: start.getTime(), start, total: 0, delivered: 0 };
    });
    const isDone = (s: CartOrderStatus) => s === "delivered" || s === "completed";
    const byKey = new Map(weeks.map((w) => [w.key, w]));
    for (const o of mine) {
      const w = byKey.get(weekStart(new Date(o.createdAt)).getTime());
      if (!w) continue;
      w.total += 1;
      if (isDone(o.status)) w.delivered += 1;
    }
    const prev = weeks[5]?.total ?? 0;
    const weekDelta = prev > 0 ? Math.round((((weeks[6]?.total ?? 0) - prev) / prev) * 100) : null;

    const total = mine.length || 1;
    const dist = STATUS_ORDER.map((k) => {
      const count = mine.filter((o) => o.status === k).length;
      return {
        key: k,
        label: statusLabels[k],
        count,
        pct: Math.round((count / total) * 100),
        tone: statusBarTone[k],
      };
    });

    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (13 - i));
      const iso = d.toISOString().slice(0, 10);
      return {
        label: d.toLocaleDateString(BCP47[locale], { weekday: "narrow" }),
        value: mine.filter((o) => dayKey(o.createdAt) === iso).length,
      };
    });

    const delivered = mine.filter((o) => isDone(o.status));
    const revenue = delivered.reduce((s, o) => s + orderTotal(o), 0);
    return {
      points: weeks.map((w) => ({
        label: w.start.toLocaleDateString(BCP47[locale], { day: "2-digit", month: "short" }),
        a: w.total,
        b: w.delivered,
      })),
      weekDelta,
      dist,
      days,
      days14Count: days.reduce((s, d) => s + d.value, 0),
      pending: mine.filter((o) => o.status === "pending").length,
      deliveredCount: delivered.length,
      revenue,
      avgTicket: delivered.length ? Math.round(revenue / delivered.length) : 0,
    };
  }, [mine, locale, orderTotal, statusLabels]);

  if (!restaurant) return null;

  const now = Date.now();
  const myCouriers = couriersByRestaurant(restaurant.id);
  const available = availableByRestaurant(restaurant.id);

  const openCourierCreate = () => {
    setEditingCourier(null);
    setCourierDraft(emptyCourierDraft);
    setCourierFormOpen(true);
  };
  const openCourierEdit = (courier: Courier) => {
    setEditingCourier(courier);
    setCourierDraft({
      name: courier.name,
      phone: courier.phone,
      vehicle: courier.vehicle,
      zone: courier.zone,
    });
    setCourierFormOpen(true);
  };
  const submitCourier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierDraft.name.trim() || !courierDraft.phone.trim()) {
      toast.error(t("adminPedidos.courierMissingFields"));
      return;
    }
    const payload = {
      name: courierDraft.name.trim(),
      phone: courierDraft.phone.trim(),
      vehicle: courierDraft.vehicle,
      zone: courierDraft.zone.trim() || "Luanda",
    };
    if (editingCourier) {
      updateCourier(editingCourier.id, payload);
      toast.success(t("adminPedidos.courierUpdatedToast"));
    } else {
      addCourier({ ...payload, restaurantId: restaurant.id });
      toast.success(t("adminPedidos.courierAddedToast"));
    }
    setCourierFormOpen(false);
  };

  // "Novo" → abre o diálogo de aceitação (escolha do pagamento exigido). Em
  // delivery, se a morada está fora do raio habitual, exige uma segunda
  // confirmação antes de abrir (evita aceitar entregas inviáveis).
  const openAccept = (order: CartOrder) => {
    if (
      order.fulfillmentType === "delivery" &&
      assessDelivery(order).level === "outOfRange" &&
      confirmFarId !== order.id
    ) {
      setConfirmFarId(order.id);
      return;
    }
    setConfirmFarId(null);
    setPayChoice(getRestaurantPaymentMethodIds(restaurant)[0] ?? "");
    setAcceptFor(order);
  };

  // Confirma a aceitação: fixa o método de pagamento exigido e, se o modo
  // estiver marcado para caução, anexa o valor configurado no perfil.
  const confirmAccept = () => {
    if (!acceptFor || !payChoice) return;
    const caution = orderModeRequiresCaution(restaurant, acceptFor.fulfillmentType)
      ? restaurant.cautionAmount
      : undefined;
    acceptOrder(acceptFor.id, payChoice, caution);
    toast.success(t("adminPedidos.updatedToast", { status: statusLabels.accepted }));
    setAcceptFor(null);
  };

  // "Aceite" → "A caminho" (delivery): obriga a atribuir um estafeta livre.
  const dispatch = (order: CartOrder) => {
    const courier = myCouriers.find((c) => c.id === courierPick && c.status === "disponivel");
    if (!courier) {
      toast.error(t("adminPedidos.courierRequired"));
      return;
    }
    assign(courier.id, order.id);
    updateOrderStatus(order.id, "onTheWay");
    toast.success(t("adminPedidos.dispatchedToast", { name: courier.name }));
  };

  // "A caminho" → "Entregue": liberta o estafeta.
  const markDelivered = (order: CartOrder) => {
    releaseOrder(order.id);
    updateOrderStatus(order.id, "delivered");
    toast.success(t("adminPedidos.updatedToast", { status: statusLabels.delivered }));
  };

  // Take away / no local: "Aceite" → "Pronto" → "Concluído" (sem estafeta).
  const markReady = (order: CartOrder) => {
    updateOrderStatus(order.id, "ready");
    toast.success(t("adminPedidos.updatedToast", { status: statusLabels.ready }));
  };
  const markCompleted = (order: CartOrder) => {
    updateOrderStatus(order.id, "completed");
    toast.success(t("adminPedidos.updatedToast", { status: statusLabels.completed }));
  };

  const reject = (order: CartOrder) => {
    releaseOrder(order.id);
    updateOrderStatus(order.id, "rejected");
    toast.success(t("adminPedidos.rejectedToast"));
  };

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "todos", label: t("adminPedidos.statusAll") },
    ...STATUS_ORDER.map((k) => ({ value: k as StatusFilter, label: statusLabels[k] })),
  ];

  const fmtDateTime = (raw: string) =>
    new Date(raw).toLocaleString(BCP47[locale], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminPedidos.eyebrow")}
        title={t("adminPedidos.title")}
        action={
          mine.length > 0 ? (
            <button
              type="button"
              onClick={() => switchTab(navTab === "pedidos" ? "stats" : "pedidos")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {navTab === "pedidos" ? (
                <>
                  <BarChart3 className="h-4 w-4" /> {t("adminPedidos.viewStats")}
                </>
              ) : (
                <>
                  <List className="h-4 w-4" /> {t("adminPedidos.viewList")}
                </>
              )}
            </button>
          ) : undefined
        }
      />

      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
        {mine.length === 0 ? (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <Package className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("adminPedidos.emptyText")}</p>
          </div>
        ) : (
          <div style={{ viewTransitionName: "admin-panel" }}>
            {navTab === "pedidos" ? (
              <>
                {/* Pesquisa + filtros */}
                <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                  <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 transition-colors focus-within:border-brand has-[:focus]:text-brand sm:max-w-xs">
                    <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("adminPedidos.searchPlaceholder")}
                      className="w-full min-w-0 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </label>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className={ADMIN_FILTER_SELECT}
                  >
                    {statusOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label} ({statusCounts[o.value]})
                      </option>
                    ))}
                  </select>

                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className={ADMIN_FILTER_SELECT}
                  >
                    <option value="priority">{t("adminPedidos.sortPriority")}</option>
                    <option value="recent">{t("adminPedidos.sortRecent")}</option>
                    <option value="old">{t("adminPedidos.sortOldest")}</option>
                    <option value="valhi">{t("adminPedidos.sortValueDesc")}</option>
                    <option value="vallo">{t("adminPedidos.sortValueAsc")}</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setCouriersOpen(true)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors sm:ml-auto ${
                      available.length > 0
                        ? "border-success/30 bg-success/5 text-success hover:border-success"
                        : "border-destructive/30 bg-destructive/5 text-destructive hover:border-destructive"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    {t("adminPedidos.couriersAvail", { count: available.length })}
                  </button>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                  {/* Lista */}
                  <div className={`min-w-0 ${activeId ? "hidden lg:block" : "block"}`}>
                    <p className="px-1 text-xs font-medium text-muted-foreground">
                      {t("adminPedidos.resultsCount", { count: list.length })}
                    </p>

                    <div className="card-soft mt-2 overflow-hidden p-[5px]">
                      <div className="mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] gap-3 rounded-[20rem] bg-primary px-6 py-4 text-sm font-bold uppercase tracking-wide text-white">
                        <span>{t("adminPedidos.colOrder")}</span>
                        <span className="text-right">{t("adminPedidos.colValue")}</span>
                        <span className="pl-3 text-right">{t("adminPedidos.colStatus")}</span>
                      </div>

                      {/* ~5 registos visíveis, resto com scroll vertical */}
                      <div className="max-h-[21rem] overflow-y-auto">
                        {list.map((o, i) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setActiveId(o.id)}
                            className={`mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[20rem] px-5 py-2.5 text-left transition-colors last:mb-0 ${
                              activeId === o.id
                                ? "bg-primary/10"
                                : i % 2 === 1
                                  ? "bg-surface/70 hover:bg-primary/5"
                                  : "hover:bg-primary/5"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {o.customerName ||
                                  o.deliveryAddress?.label ||
                                  t("adminPedidos.customerFallback")}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                                {o.deliveryAddress ? (
                                  <>
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {o.deliveryAddress.label} · {o.deliveryAddress.line1}
                                  </>
                                ) : (
                                  <>
                                    <Package className="h-3 w-3 shrink-0" />
                                    {t(`fulfillment.${o.fulfillmentType}`)}
                                  </>
                                )}
                              </span>
                              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="rounded-full bg-surface px-1.5 py-0.5 text-muted-foreground">
                                  {t(`fulfillment.${o.fulfillmentType}`)}
                                </span>
                                {o.fulfillmentType === "delivery" &&
                                  (() => {
                                    const a = assessDelivery(o);
                                    return (
                                      <span
                                        className={`rounded-full px-1.5 py-0.5 ${deliveryChipTone[a.level]}`}
                                      >
                                        {t("adminPedidos.distanceKm", { km: a.km })}
                                      </span>
                                    );
                                  })()}
                                {o.status === "pending" &&
                                  minutesSince(o.createdAt, now) >= PENDING_SLA_MIN && (
                                    <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 font-bold text-destructive">
                                      {t("adminPedidos.waitingMin", {
                                        min: minutesSince(o.createdAt, now),
                                      })}
                                    </span>
                                  )}
                                {courierForOrder(o.id) && (
                                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                                    <Bike className="h-3 w-3" />
                                    {firstName(courierForOrder(o.id)!.name)}
                                  </span>
                                )}
                                {o.promoCode && (
                                  <span className="rounded-full bg-success/15 px-1.5 py-0.5 font-bold text-success">
                                    {o.promoCode}
                                  </span>
                                )}
                                <span className="text-muted-foreground">
                                  {t("adminPedidos.itemsCount", { count: itemCount(o) })}
                                </span>
                              </span>
                            </span>
                            <span className="text-right text-xs font-semibold text-foreground">
                              {formatKz(orderTotal(o))}
                            </span>
                            <span className="flex items-center gap-1 pl-3">
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${statusTone[o.status]}`}
                              >
                                {statusLabels[o.status]}
                              </span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </span>
                          </button>
                        ))}
                        {list.length === 0 && (
                          <p className="p-8 text-center text-sm text-muted-foreground">
                            {t("adminPedidos.emptyNoResults")}
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
                                {active.customerName || t("adminPedidos.customerFallback")}
                              </h2>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {t("adminPedidos.orderRef", { ref: orderShortId(active.id) })} ·{" "}
                                {fmtDateTime(active.createdAt)}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {(active.customerPhone || active.customerEmail) && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label={t("adminPedidos.contactPopoverTitle")}
                                      className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                                    >
                                      <Phone className="h-4 w-4" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    align="end"
                                    className="w-auto rounded-xl border border-border bg-card p-3 text-sm"
                                  >
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                      {t("adminPedidos.contactPopoverTitle")}
                                    </p>
                                    {active.customerPhone ? (
                                      <a
                                        href={`tel:${active.customerPhone.replace(/\s/g, "")}`}
                                        className="flex items-center gap-1.5 text-foreground hover:text-primary"
                                      >
                                        <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                                        {active.customerPhone}
                                      </a>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        {t("adminPedidos.noPhone")}
                                      </span>
                                    )}
                                    {active.customerEmail && (
                                      <a
                                        href={`mailto:${active.customerEmail}`}
                                        className="mt-1 flex items-center gap-1.5 text-foreground hover:text-primary"
                                      >
                                        <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                                        <span className="truncate">{active.customerEmail}</span>
                                      </a>
                                    )}
                                  </PopoverContent>
                                </Popover>
                              )}
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[active.status]}`}
                              >
                                {statusLabels[active.status]}
                              </span>
                            </div>
                          </div>

                          {/* Ações no topo — o passo mais importante sem obrigar a scroll */}
                          {active.status !== "delivered" &&
                            active.status !== "completed" &&
                            active.status !== "rejected" &&
                            active.status !== "canceled" && (
                              <div className="mt-5 border-t border-border pt-5">
                                <div className="flex flex-wrap gap-2">
                                  {(active.status === "pending" ||
                                    active.status === "accepted") && (
                                    <button
                                      type="button"
                                      onClick={() => reject(active)}
                                      className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-destructive/50 px-4 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5"
                                    >
                                      {t("adminPedidos.reject")}
                                    </button>
                                  )}

                                  {active.status === "pending" && (
                                    <button
                                      type="button"
                                      onClick={() => openAccept(active)}
                                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-opacity hover:opacity-90 ${
                                        confirmFarId === active.id
                                          ? "bg-brand text-brand-foreground"
                                          : "bg-primary text-primary-foreground"
                                      }`}
                                    >
                                      {confirmFarId === active.id
                                        ? t("adminPedidos.acceptAnyway")
                                        : t("adminPedidos.acceptOrder")}
                                    </button>
                                  )}

                                  {active.status === "accepted" &&
                                    active.fulfillmentType === "delivery" && (
                                      <button
                                        type="button"
                                        disabled={!courierPick}
                                        onClick={() => dispatch(active)}
                                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        <Bike className="h-3.5 w-3.5" />
                                        {t("adminPedidos.markOnTheWay")}
                                      </button>
                                    )}

                                  {active.status === "accepted" &&
                                    active.fulfillmentType !== "delivery" && (
                                      <button
                                        type="button"
                                        onClick={() => markReady(active)}
                                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                                      >
                                        <Package className="h-3.5 w-3.5" />
                                        {t("adminPedidos.markReady")}
                                      </button>
                                    )}

                                  {active.status === "onTheWay" && (
                                    <button
                                      type="button"
                                      onClick={() => markDelivered(active)}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                                    >
                                      {t("adminPedidos.markDelivered")}
                                    </button>
                                  )}

                                  {active.status === "ready" && (
                                    <button
                                      type="button"
                                      onClick={() => markCompleted(active)}
                                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                                    >
                                      {t("adminPedidos.markCompleted")}
                                    </button>
                                  )}
                                </div>

                                {active.status === "pending" && confirmFarId === active.id && (
                                  <p className="mt-2 text-xs font-medium text-brand">
                                    {t("adminPedidos.outOfRangeConfirm", {
                                      radius: DELIVERY_RADIUS_KM,
                                    })}
                                  </p>
                                )}
                                {active.status === "accepted" &&
                                  active.fulfillmentType === "delivery" &&
                                  !courierPick &&
                                  available.length > 0 && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {t("adminPedidos.dispatchHint")}
                                    </p>
                                  )}
                              </div>
                            )}

                          {/* Estafeta — atribuição obrigatória para despachar (só delivery) */}
                          {active.fulfillmentType === "delivery" &&
                            (active.status === "accepted" || active.status === "onTheWay") && (
                              <div className="mt-4 border-t border-border pt-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                  {t("adminPedidos.courierTitle")}
                                </p>
                                {(() => {
                                  const assigned = courierForOrder(active.id);
                                  if (assigned) {
                                    return (
                                      <div className="mt-2 flex items-center gap-3 rounded-lg bg-surface p-3">
                                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                                          <UserRound className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-semibold text-foreground">
                                            {assigned.name}
                                          </p>
                                          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                                            <Bike className="h-3 w-3" />
                                            {vehicleLabels[assigned.vehicle]}
                                            <span aria-hidden>·</span>
                                            <Phone className="h-3 w-3" />
                                            {assigned.phone}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  }
                                  if (active.status === "onTheWay") {
                                    return (
                                      <p className="mt-2 text-xs text-muted-foreground">
                                        {t("adminPedidos.courierUnknown")}
                                      </p>
                                    );
                                  }
                                  if (available.length === 0) {
                                    return (
                                      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-destructive">
                                        <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                                        {t("adminPedidos.noCouriers")}
                                      </p>
                                    );
                                  }
                                  return (
                                    <select
                                      value={courierPick}
                                      onChange={(e) => setCourierPick(e.target.value)}
                                      className={`${ADMIN_FILTER_SELECT} mt-2 w-full`}
                                    >
                                      <option value="">{t("adminPedidos.courierPick")}</option>
                                      {available.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name} — {vehicleLabels[c.vehicle]}
                                        </option>
                                      ))}
                                    </select>
                                  );
                                })()}
                              </div>
                            )}

                          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-5 text-sm">
                            <AdminField label={t("adminPedidos.detailFulfillment")}>
                              {t(`fulfillment.${active.fulfillmentType}`)}
                              {active.fulfillmentType === "dinein" && active.partySize
                                ? ` · ${active.partySize}`
                                : ""}
                            </AdminField>
                            {active.deliveryAddress ? (
                              <AdminField label={t("adminPedidos.detailDelivery")}>
                                <span className="block">{active.deliveryAddress.label}</span>
                                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                                  {active.deliveryAddress.line1}
                                  {active.deliveryAddress.line2
                                    ? ` · ${active.deliveryAddress.line2}`
                                    : ""}
                                </span>
                              </AdminField>
                            ) : null}
                            <AdminField label={t("adminPedidos.detailPayment")}>
                              {getPaymentMethod(active.paymentMethod)?.label ??
                                active.paymentMethod ??
                                t("adminPedidos.noPayment")}
                            </AdminField>
                            {active.cautionRequired ? (
                              <AdminField label={t("adminPedidos.detailCaution")}>
                                {formatKz(active.cautionRequired)}
                              </AdminField>
                            ) : null}
                          </dl>

                          {/* Avaliação da entrega — distância vs. raio habitual (só delivery) */}
                          {active.fulfillmentType === "delivery" &&
                            (() => {
                              const a = assessDelivery(active);
                              const box =
                                a.level === "outOfRange"
                                  ? "border-destructive/40 bg-destructive/5"
                                  : a.level === "far"
                                    ? "border-brand/40 bg-brand/5"
                                    : "border-border bg-surface";
                              const badge =
                                a.level === "outOfRange"
                                  ? "bg-destructive/15 text-destructive"
                                  : a.level === "far"
                                    ? "bg-brand/15 text-brand"
                                    : "bg-success/15 text-success";
                              const label =
                                a.level === "outOfRange"
                                  ? t("adminPedidos.levelOutOfRange")
                                  : a.level === "far"
                                    ? t("adminPedidos.levelFar")
                                    : t("adminPedidos.levelOk");
                              const wait =
                                active.status === "pending"
                                  ? minutesSince(active.createdAt, now)
                                  : 0;
                              return (
                                <div className={`mt-4 rounded-xl border p-3 ${box}`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                      {t("adminPedidos.deliveryEval")}
                                    </p>
                                    <span
                                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${badge}`}
                                    >
                                      {label}
                                    </span>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-foreground">
                                    <span className="flex items-center gap-1.5">
                                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                      {t("adminPedidos.distanceKm", { km: a.km })}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                      {t("adminPedidos.etaMinutes", { min: a.etaMin })}
                                    </span>
                                    {wait >= PENDING_SLA_MIN && (
                                      <span className="flex items-center gap-1.5 font-semibold text-destructive">
                                        <TriangleAlert className="h-3.5 w-3.5" />
                                        {t("adminPedidos.waitingMin", { min: wait })}
                                      </span>
                                    )}
                                  </div>
                                  {a.level !== "ok" && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {a.level === "outOfRange"
                                        ? t("adminPedidos.outOfRangeNote", { radius: a.radiusKm })
                                        : t("adminPedidos.farNote", { radius: a.radiusKm })}
                                    </p>
                                  )}
                                </div>
                              );
                            })()}

                          {active.note && (
                            <div className="mt-4 border-t border-border pt-4">
                              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                {t("adminPedidos.observationLabel")}
                              </p>
                              <p className="mt-1.5 rounded-lg bg-surface p-3 text-sm text-foreground">
                                {active.note}
                              </p>
                            </div>
                          )}

                          {/* Itens */}
                          <div className="mt-4 border-t border-border pt-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                              {t("adminPedidos.itemsTitle")}
                            </p>
                            <ul className="mt-2 space-y-1.5">
                              {active.lines.map((line) => {
                                const item = getMenuItem(line.menuItemId);
                                if (!item) return null;
                                const custom = lineCustomizations(
                                  line,
                                  t("adminPedidos.customRemoved"),
                                  t("adminPedidos.customAdded"),
                                );
                                return (
                                  <li
                                    key={line.key}
                                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm"
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate text-muted-foreground">
                                        {line.qty}× {item.name}
                                      </span>
                                      {custom.length > 0 && (
                                        <span className="block truncate text-xs text-brand">
                                          {custom.join(" · ")}
                                        </span>
                                      )}
                                    </span>
                                    <span className="shrink-0 font-semibold">
                                      {formatKz(lineUnitPrice(line) * line.qty)}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                            <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                              <div className="flex justify-between text-muted-foreground">
                                <span>{t("adminPedidos.subtotal")}</span>
                                <span>{formatKz(orderSubtotal(active))}</span>
                              </div>
                              {active.promoCode && (
                                <div className="flex justify-between text-success">
                                  <span>
                                    {t("adminPedidos.promoLine", { code: active.promoCode })}
                                  </span>
                                  <span>
                                    {orderDiscount(active) > 0
                                      ? `− ${formatKz(orderDiscount(active))}`
                                      : t("adminPedidos.promoFreeDelivery")}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between text-muted-foreground">
                                <span>
                                  {t("adminPedidos.deliveryFee")}
                                  {active.fulfillmentType === "delivery" &&
                                    (() => {
                                      const extra = Math.max(
                                        0,
                                        Math.ceil(
                                          orderDistanceKm(active) - deliveryPolicy.freeRadiusKm,
                                        ),
                                      );
                                      return extra > 0 ? (
                                        <span className="ml-1 text-[11px]">
                                          {t("adminPedidos.deliverySurchargeNote", {
                                            radius: deliveryPolicy.freeRadiusKm,
                                            extraKm: extra,
                                            surcharge: formatKz(deliveryPolicy.perKmSurchargeKz),
                                          })}
                                        </span>
                                      ) : null;
                                    })()}
                                </span>
                                <span>
                                  {formatKz(
                                    orderTotal(active) -
                                      orderSubtotal(active) +
                                      orderDiscount(active),
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between font-bold text-foreground">
                                <span>{t("adminPedidos.total")}</span>
                                <span className="text-primary">{formatKz(orderTotal(active))}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="grid place-items-center gap-3 py-12 text-center">
                          <Package className="h-10 w-10 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {t("adminPedidos.chooseHint")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <StatSection title={t("adminPedidos.statsTitle")} hint={t("adminPedidos.statsHint")}>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <StatCard
                    wide
                    title={t("adminPedidos.chartWeeklyTitle")}
                    subtitle={t("adminPedidos.chartWeeklySubtitle")}
                    right={
                      <TrendBadge delta={insights.weekDelta} label={t("adminPedidos.vsPrevWeek")} />
                    }
                  >
                    <TrendArea
                      points={insights.points}
                      legendA={t("adminPedidos.legendTotal")}
                      legendB={t("adminPedidos.legendDelivered")}
                    />
                  </StatCard>

                  <StatCard
                    title={t("adminPedidos.statusDistTitle")}
                    subtitle={t("adminPedidos.resultsCount", { count: mine.length })}
                  >
                    <StatBars rows={insights.dist} />
                  </StatCard>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <KpiTile
                    icon={Clock}
                    tone="brand"
                    label={t("adminPedidos.kpiPending")}
                    value={String(insights.pending)}
                    hint={t("adminPedidos.kpiPendingHint")}
                  />
                  <KpiTile
                    icon={TrendingUp}
                    tone="primary"
                    label={t("adminPedidos.kpiRecent")}
                    value={String(insights.days14Count)}
                    hint={t("adminPedidos.kpiRecentHint")}
                  >
                    <MiniBars bars={insights.days} unit={t("adminPedidos.ordersUnit")} />
                  </KpiTile>
                  <KpiTile
                    icon={Wallet}
                    tone="success"
                    label={t("adminPedidos.kpiRevenue")}
                    value={formatKz(insights.revenue)}
                    hint={t("adminPedidos.kpiRevenueHint", {
                      count: insights.deliveredCount,
                      avg: formatKz(insights.avgTicket),
                    })}
                  />
                </div>
              </StatSection>
            )}
          </div>
        )}
      </div>

      {/* Aceitar pedido — escolher o método de pagamento exigido */}
      <Dialog open={!!acceptFor} onOpenChange={(o) => !o && setAcceptFor(null)}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="font-display text-lg font-bold">
            {t("adminPedidos.acceptDialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("adminPedidos.acceptDialogDesc")}</DialogDescription>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("adminPedidos.requiredPaymentLabel")}
          </p>
          <div className="mt-2 space-y-2">
            {getRestaurantPaymentMethodIds(restaurant).map((id) => {
              const m = getPaymentMethod(id);
              if (!m) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPayChoice(id)}
                  className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border p-3 text-left ${
                    payChoice === id ? "border-brand bg-brand/5" : "border-border"
                  }`}
                >
                  <span className="grid h-8 w-14 shrink-0 place-items-center rounded-lg bg-surface text-[10px] font-bold text-primary">
                    {m.brand}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{m.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{m.detail}</span>
                  </span>
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      payChoice === id ? "border-brand bg-brand" : "border-border"
                    }`}
                  >
                    {payChoice === id && (
                      <span className="h-2 w-2 rounded-full bg-brand-foreground" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {acceptFor && orderModeRequiresCaution(restaurant, acceptFor.fulfillmentType) && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-brand/40 bg-brand/5 p-3 text-xs">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <p className="text-muted-foreground">
                {t("adminPedidos.cautionAutoNotice", {
                  amount: formatKz(restaurant.cautionAmount),
                })}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={!payChoice}
            onClick={confirmAccept}
            className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {t("adminPedidos.confirmAccept")}
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={couriersOpen} onOpenChange={setCouriersOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <Users className="h-5 w-5 text-primary" />
            {t("adminPedidos.couriersTitle")}
          </DialogTitle>
          <DialogDescription>{t("adminPedidos.couriersDesc")}</DialogDescription>

          <button
            type="button"
            onClick={openCourierCreate}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/50 px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
          >
            <Plus className="h-3.5 w-3.5" /> {t("adminPedidos.courierAdd")}
          </button>

          {myCouriers.length === 0 ? (
            <p className="mt-4 rounded-xl bg-surface p-4 text-center text-sm text-muted-foreground">
              {t("adminPedidos.couriersEmpty")}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {myCouriers.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 rounded-xl border border-border p-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-muted-foreground">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {vehicleLabels[c.vehicle]} · {c.phone}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${courierStatusTone[c.status]}`}
                  >
                    {courierStatusLabels[c.status]}
                  </span>
                  {c.status !== "em_entrega" && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setStatus(c.id, c.status === "offline" ? "disponivel" : "offline")
                        }
                        className="shrink-0 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                      >
                        {c.status === "offline"
                          ? t("adminPedidos.courierActivate")
                          : t("adminPedidos.courierPause")}
                      </button>
                      <button
                        type="button"
                        aria-label={t("adminPedidos.courierEdit")}
                        onClick={() => openCourierEdit(c)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("adminPedidos.courierRemove")}
                        onClick={() => {
                          removeCourier(c.id);
                          toast.success(t("adminPedidos.courierRemovedToast"));
                        }}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={courierFormOpen} onOpenChange={setCourierFormOpen}>
        <DialogContent className="max-w-md rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="font-display text-lg font-bold">
            {editingCourier
              ? t("adminPedidos.courierEditTitle")
              : t("adminPedidos.courierAddTitle")}
          </DialogTitle>
          <DialogDescription>{t("adminPedidos.courierFormHint")}</DialogDescription>
          <form onSubmit={submitCourier} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="courier-name" className="text-xs font-medium text-muted-foreground">
                {t("adminPedidos.courierNameLabel")}
              </label>
              <input
                id="courier-name"
                value={courierDraft.name}
                onChange={(e) => setCourierDraft((d) => ({ ...d, name: e.target.value }))}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="courier-phone"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t("adminPedidos.courierPhoneLabel")}
                </label>
                <input
                  id="courier-phone"
                  value={courierDraft.phone}
                  onChange={(e) => setCourierDraft((d) => ({ ...d, phone: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="courier-zone" className="text-xs font-medium text-muted-foreground">
                  {t("adminPedidos.courierZoneLabel")}
                </label>
                <input
                  id="courier-zone"
                  value={courierDraft.zone}
                  onChange={(e) => setCourierDraft((d) => ({ ...d, zone: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="courier-vehicle"
                className="text-xs font-medium text-muted-foreground"
              >
                {t("adminPedidos.courierVehicleLabel")}
              </label>
              <select
                id="courier-vehicle"
                value={courierDraft.vehicle}
                onChange={(e) =>
                  setCourierDraft((d) => ({ ...d, vehicle: e.target.value as CourierVehicle }))
                }
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {COURIER_VEHICLES.map((v) => (
                  <option key={v} value={v}>
                    {vehicleLabels[v]}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {editingCourier ? t("adminPedidos.courierSave") : t("adminPedidos.courierCreate")}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
