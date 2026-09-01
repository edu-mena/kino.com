import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogIn,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import { ADMIN_FILTER_SELECT, AdminField } from "@/components/admin-stats";
import { SystemPageHeading } from "@/components/system-shell";
import { getAllRestaurants } from "@/data/helpers";
import { setFeatured } from "@/data/system-flags-store";
import type { SubStatus } from "@/data/subscriptions-store";
import { useTranslation } from "@/i18n";
import { useCart } from "@/lib/cart";
import { useReservations } from "@/lib/reservations";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useSubscriptions } from "@/lib/subscriptions";

export const Route = createFileRoute("/sistema/restaurantes")({
  head: () => ({ meta: [{ title: "Restaurantes — Sistema Kino.com" }] }),
  component: SistemaRestaurantes,
});

const statusTone: Record<SubStatus, string> = {
  trial: "bg-brand/15 text-brand",
  active: "bg-success/15 text-success",
  overdue: "bg-destructive/15 text-destructive",
  suspended: "bg-muted-foreground/15 text-muted-foreground",
};

function SistemaRestaurantes() {
  const navigate = useNavigate();
  const { byRestaurant } = useSubscriptions();
  const { orders } = useCart();
  const { reservations } = useReservations();
  const { login: loginRestaurant } = useRestaurantAdmin();
  const { t } = useTranslation();

  const [flagsTick, bumpFlags] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener("kino:menu-changed", bumpFlags);
    return () => window.removeEventListener("kino:menu-changed", bumpFlags);
  }, []);
  // `flagsTick` força reler os restaurantes quando o destaque muda.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const restaurants = useMemo(() => getAllRestaurants(), [flagsTick]);

  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<"todos" | "basico" | "pro">("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | SubStatus>("todos");
  const [provinceFilter, setProvinceFilter] = useState("todos");
  const [activeId, setActiveId] = useState<string | null>(null);

  const provinces = useMemo(
    () =>
      [...new Set(restaurants.map((r) => r.neighborhood))].sort((a, b) => a.localeCompare(b, "pt")),
    [restaurants],
  );

  const ordersByRestaurant = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) m.set(o.restaurantId, (m.get(o.restaurantId) ?? 0) + 1);
    return m;
  }, [orders]);
  const resvByRestaurant = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reservations) m.set(r.restaurantId, (m.get(r.restaurantId) ?? 0) + 1);
    return m;
  }, [reservations]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants
      .filter((r) => {
        const sub = byRestaurant(r.id);
        if (planFilter !== "todos" && sub?.plan !== planFilter) return false;
        if (statusFilter !== "todos" && sub?.status !== statusFilter) return false;
        if (provinceFilter !== "todos" && r.neighborhood !== provinceFilter) return false;
        if (q && !r.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt"));
  }, [restaurants, byRestaurant, query, planFilter, statusFilter, provinceFilter]);

  const active = useMemo(
    () => restaurants.find((r) => r.id === activeId) ?? null,
    [restaurants, activeId],
  );
  const activeSub = active ? byRestaurant(active.id) : undefined;

  const enterPanel = (id: string, name: string) => {
    loginRestaurant(id);
    toast.success(t("sistema.restaurantes.enterToast", { name }));
    navigate({ to: "/admin" });
  };

  return (
    <div className="pb-16">
      <SystemPageHeading
        eyebrow={t("sistema.restaurantes.eyebrow")}
        title={t("sistema.restaurantes.title")}
        description={t("sistema.restaurantes.description")}
      />

      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 transition-colors focus-within:border-brand sm:max-w-xs">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("sistema.restaurantes.searchPlaceholder")}
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
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className={ADMIN_FILTER_SELECT}
          >
            <option value="todos">{t("sistema.restaurantes.provinceAll")}</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Lista */}
          <div className={`min-w-0 ${activeId ? "hidden lg:block" : "block"}`}>
            <p className="px-1 text-xs font-medium text-muted-foreground">
              {t("sistema.restaurantes.resultsCount", { count: list.length })}
            </p>
            <div className="card-soft mt-2 overflow-hidden p-[5px]">
              <div className="mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] gap-3 rounded-[20rem] bg-primary px-6 py-4 text-sm font-bold uppercase tracking-wide text-white">
                <span>{t("sistema.restaurantes.colRestaurant")}</span>
                <span className="text-right">{t("sistema.subscricoes.colPlan")}</span>
                <span className="pl-3 text-right">{t("sistema.subscricoes.colStatus")}</span>
              </div>
              {list.map((r, i) => {
                const sub = byRestaurant(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveId(r.id)}
                    className={`mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[20rem] px-5 py-3 text-left transition-colors last:mb-0 ${
                      activeId === r.id
                        ? "bg-primary/10"
                        : i % 2 === 1
                          ? "bg-surface/70 hover:bg-primary/5"
                          : "hover:bg-primary/5"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                        {r.isFeatured && <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" />}
                        {r.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {r.neighborhood} ·{" "}
                        {t("sistema.restaurantes.ordersShort", {
                          count: ordersByRestaurant.get(r.id) ?? 0,
                        })}
                      </span>
                    </span>
                    <span className="text-right text-xs font-semibold text-foreground">
                      {sub ? t(`sistema.plan.${sub.plan}`) : "—"}
                    </span>
                    <span className="flex items-center gap-1 pl-3">
                      {sub && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${statusTone[sub.status]}`}
                        >
                          {t(`sistema.subStatus.${sub.status}`)}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </span>
                  </button>
                );
              })}
              {list.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  {t("sistema.restaurantes.empty")}
                </p>
              )}
            </div>
          </div>

          {/* Detalhe */}
          <div className={`min-w-0 ${activeId ? "block" : "hidden lg:block"}`}>
            <div className="card-soft sticky top-24 overflow-hidden p-0 lg:top-6">
              {active ? (
                <>
                  <div className="relative h-32">
                    <img src={active.coverImage} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <button
                      type="button"
                      onClick={() => setActiveId(null)}
                      className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-foreground lg:hidden"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> {t("common.back")}
                    </button>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h2 className="font-display text-lg font-extrabold text-white">
                        {active.name}
                      </h2>
                      <p className="flex items-center gap-1 text-xs text-white/90">
                        <Star className="h-3 w-3 fill-star text-star" />
                        {active.rating.toFixed(1)} · {active.cuisine} · {active.neighborhood}
                      </p>
                    </div>
                  </div>

                  <div className="p-6">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                      <AdminField label={t("sistema.subscricoes.colPlan")}>
                        {activeSub ? t(`sistema.plan.${activeSub.plan}`) : "—"}
                      </AdminField>
                      <AdminField label={t("sistema.subscricoes.colStatus")}>
                        {activeSub ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusTone[activeSub.status]}`}
                          >
                            {t(`sistema.subStatus.${activeSub.status}`)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </AdminField>
                      <AdminField label={t("sistema.restaurantes.ordersLabel")}>
                        {ordersByRestaurant.get(active.id) ?? 0}
                      </AdminField>
                      <AdminField label={t("sistema.restaurantes.reservationsLabel")}>
                        {resvByRestaurant.get(active.id) ?? 0}
                      </AdminField>
                      <AdminField label={t("sistema.restaurantes.deliveryLabel")}>
                        {active.isDeliveryAvailable
                          ? t("sistema.restaurantes.deliveryOn")
                          : t("sistema.restaurantes.deliveryOff")}
                      </AdminField>
                      <AdminField label={t("sistema.restaurantes.featuredLabel")}>
                        {active.isFeatured
                          ? t("sistema.restaurantes.featuredYes")
                          : t("sistema.restaurantes.featuredNo")}
                      </AdminField>
                    </dl>

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
                      <button
                        type="button"
                        onClick={() => {
                          setFeatured(active.id, !active.isFeatured);
                          toast.success(
                            active.isFeatured
                              ? t("sistema.restaurantes.unfeatureToast")
                              : t("sistema.restaurantes.featureToast"),
                          );
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors ${
                          active.isFeatured
                            ? "border-brand/50 text-brand hover:bg-brand/5"
                            : "border-border text-foreground hover:border-primary"
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {active.isFeatured
                          ? t("sistema.restaurantes.unfeature")
                          : t("sistema.restaurantes.feature")}
                      </button>
                      <button
                        type="button"
                        onClick={() => enterPanel(active.id, active.name)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        {t("sistema.restaurantes.enterPanel")}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate({ to: "/sistema/subscricoes", search: { r: active.id } })
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                      >
                        {t("sistema.restaurantes.manageSub")}{" "}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={`/restaurantes/${active.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("sistema.restaurantes.viewPublic")}
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid place-items-center gap-3 p-12 text-center">
                  <Star className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t("sistema.restaurantes.chooseHint")}
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
