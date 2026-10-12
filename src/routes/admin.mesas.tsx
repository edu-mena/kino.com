import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Armchair, CalendarRange, LayoutGrid, QrCode, Settings2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeading, RestaurantGate, RestaurantWallpaper } from "@/components/admin-shell";
import { KpiTile } from "@/components/admin-stats";
import { QrStudio } from "@/components/qr/qr-studio";
import { DayFloor } from "@/components/tables/day-floor";
import { ReservationSettingsPanel } from "@/components/tables/reservation-settings-panel";
import { TablesManager } from "@/components/tables/tables-manager";
import { useTranslation } from "@/i18n";
import { DEFAULT_SLOT_MIN } from "@/lib/reservation-occupancy";
import { useReservations } from "@/lib/reservations";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { isTableActive } from "@/lib/table-layout";
import { useTables } from "@/lib/tables";
import { cn } from "@/lib/utils";

const TABS = ["sala", "mesas", "qr", "regras"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/admin/mesas")({
  head: () => ({ meta: [{ title: "Sala e mesas — Painel Luku.com" }] }),
  // `?tab=qr` — p.ex. o atalho "Código QR" do cardápio abre direto o estúdio.
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => {
    const tab = s["tab"];
    return typeof tab === "string" && (TABS as readonly string[]).includes(tab)
      ? { tab: tab as Tab }
      : {};
  },
  component: () => (
    <RestaurantGate>
      <AdminMesas />
    </RestaurantGate>
  ),
});

const TAB_ICON: Record<Tab, typeof Armchair> = {
  sala: LayoutGrid,
  mesas: Armchair,
  qr: QrCode,
  regras: Settings2,
};

function AdminMesas() {
  const { restaurant } = useRestaurantAdmin();
  const { tab: tabParam } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/mesas" });
  const {
    tablesByRestaurant,
    combinations,
    combineTables,
    updateCombination,
    separateCombination,
    updateTable,
  } = useTables();
  const { reservations } = useReservations();
  const { t } = useTranslation();
  const [qrFocus, setQrFocus] = useState<string | null>(null);

  const tab: Tab = tabParam ?? "sala";
  const setTab = (next: Tab) => {
    if (next !== "qr") setQrFocus(null);
    void navigate({ search: next === "sala" ? {} : { tab: next }, replace: true });
  };

  const tables = useMemo(
    () => (restaurant ? tablesByRestaurant(restaurant.id) : []),
    [restaurant, tablesByRestaurant],
  );
  const restaurantReservations = useMemo(
    () => (restaurant ? reservations.filter((r) => r.restaurantId === restaurant.id) : []),
    [reservations, restaurant],
  );

  if (!restaurant) return null;

  const active = tables.filter(isTableActive);
  const totalSeats = active.reduce((sum, tbl) => sum + tbl.seats, 0);

  return (
    <div className="pb-16">
      <RestaurantWallpaper src={restaurant.wallpaper} veil />
      <AdminPageHeading
        eyebrow={t("adminMesas.eyebrow")}
        title={t("adminMesas.title")}
        description={t("adminMesas.description")}
      />

      <div className="mx-auto mt-6 max-w-6xl space-y-6 px-4 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiTile
            icon={Armchair}
            tone="primary"
            big={false}
            label={t("adminMesas.tableCount")}
            value={String(active.length)}
            hint={
              tables.length > active.length
                ? t("adminMesas.tableCountHintInactive", { count: tables.length - active.length })
                : t("adminMesas.tableCountHint")
            }
          />
          <KpiTile
            icon={Users}
            tone="success"
            big={false}
            label={t("adminMesas.totalSeats")}
            value={String(totalSeats)}
            hint={t("adminMesas.totalSeatsHint")}
          />
        </div>

        <div
          role="tablist"
          aria-label={t("adminMesas.title")}
          className="flex gap-1 overflow-x-auto rounded-full border border-border bg-card p-1"
        >
          {TABS.map((key) => {
            const Icon = TAB_ICON[key];
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors sm:text-sm",
                  tab === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {t(`adminMesas.tab.${key}`)}
              </button>
            );
          })}
        </div>

        {tab === "sala" && (
          <DayFloor
            tables={tables}
            combinations={combinations}
            reservations={restaurantReservations}
            slotMin={restaurant.reservationSlotMinutes ?? DEFAULT_SLOT_MIN}
            onCombine={(input) => combineTables(restaurant.id, input)}
            onUpdateCombination={(id, patch) => updateCombination(id, patch)}
            onSeparate={separateCombination}
            onReactivate={async (id) => {
              const ok = await updateTable(id, { isActive: true });
              if (ok) toast.success(t("adminMesas.updatedToast"));
              else toast.error(t("adminMesas.saveFailedError"));
            }}
          />
        )}

        {tab === "mesas" && (
          <TablesManager
            restaurantId={restaurant.id}
            tables={tables}
            onShowQr={(id) => {
              setQrFocus(id);
              void navigate({ search: { tab: "qr" }, replace: true });
            }}
          />
        )}

        {tab === "qr" && (
          <QrStudio restaurant={restaurant} tables={tables} focusTableId={qrFocus} />
        )}

        {tab === "regras" && <ReservationSettingsPanel restaurant={restaurant} />}

        {tab === "sala" && (
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" />
            {t("adminMesas.day.footerHint")}
          </p>
        )}
      </div>
    </div>
  );
}
