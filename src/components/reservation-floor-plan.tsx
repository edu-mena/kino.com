import { Armchair, Check, GripVertical, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { RestaurantTable } from "@/data/tables-store";
import type { Reservation } from "@/data/types";
import { useTranslation } from "@/i18n";
import { isOccupying, overlaps } from "@/lib/reservation-occupancy";

/**
 * Planta do dia: reservas sem mesa à esquerda (arrastáveis), grelha de mesas
 * à direita (drop zones). Arrastar uma reserva para uma mesa atribui-a;
 * largar em "Sem mesa" limpa. Em toque, o `<select>` de cada cartão é o
 * fallback (DnD nativo não funciona bem em touch).
 */
export function ReservationFloorPlan({
  reservations,
  tables,
  slotMin,
  totalSeats,
  onAssign,
  onConfirm,
}: {
  reservations: Reservation[];
  tables: RestaurantTable[];
  slotMin: number;
  totalSeats: number;
  onAssign: (id: string, tableId?: string) => void;
  onConfirm: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));
  const [dragId, setDragId] = useState<string | null>(null);

  const dayReservations = useMemo(
    () =>
      reservations
        .filter((r) => r.date === dateStr && isOccupying(r.status))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [reservations, dateStr],
  );
  const unassigned = dayReservations.filter((r) => !r.tableId);
  const daySeats = dayReservations.reduce((s, r) => s + r.peopleCount, 0);

  const drop = (tableId?: string) => {
    if (dragId) onAssign(dragId, tableId);
    setDragId(null);
  };

  const ResCard = ({ r }: { r: Reservation }) => (
    <div
      draggable
      onDragStart={(e) => {
        setDragId(r.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => setDragId(null)}
      className="cursor-grab rounded-lg border border-border bg-card p-2.5 text-xs active:cursor-grabbing"
    >
      <div className="flex items-center gap-1.5">
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
          {r.time} · {r.customerName}
        </span>
        <span className="shrink-0 text-muted-foreground">
          {t("adminReservas.tableSeats", { count: r.peopleCount })}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <select
          value={r.tableId ?? ""}
          onChange={(e) => onAssign(r.id, e.target.value || undefined)}
          className="min-w-0 flex-1 rounded border border-border bg-card px-1.5 py-1 text-[11px] text-foreground outline-none focus:border-brand"
        >
          <option value="">{t("adminReservas.tableNone")}</option>
          {tables.map((tbl) => (
            <option key={tbl.id} value={tbl.id}>
              {tbl.name}
            </option>
          ))}
        </select>
        {r.status === "Pendente" && (
          <button
            type="button"
            onClick={() => onConfirm(r.id)}
            aria-label={t("adminReservas.confirm")}
            className="grid h-6 w-6 shrink-0 place-items-center rounded bg-primary text-primary-foreground"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-foreground">
          {t("adminReservas.tab.dia")}
        </h2>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t("adminReservas.dayDate")}
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="rounded-lg border border-border bg-card px-2 py-1 text-sm text-foreground outline-none focus:border-brand"
          />
        </label>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("adminReservas.daySummary", {
          count: dayReservations.length,
          seats: daySeats,
          total: totalSeats || "—",
        })}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        {/* Sem mesa */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => drop(undefined)}
          className={`card-soft space-y-2 p-3 ${dragId ? "border-brand/50" : ""}`}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("adminReservas.dayUnassigned", { count: unassigned.length })}
          </p>
          {unassigned.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {t("adminReservas.dayAllSeated")}
            </p>
          ) : (
            unassigned.map((r) => <ResCard key={r.id} r={r} />)
          )}
        </div>

        {/* Grelha de mesas */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tables.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("adminReservas.dayNoTables")}</p>
          )}
          {tables.map((tbl) => {
            const here = dayReservations.filter((r) => r.tableId === tbl.id);
            const seats = here.reduce((s, r) => s + r.peopleCount, 0);
            const clash = here.some((a, i) =>
              here.some((b, j) => i !== j && overlaps(a, b, slotMin)),
            );
            const over = seats > tbl.seats || clash;
            return (
              <div
                key={tbl.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(tbl.id)}
                className={`rounded-xl border p-3 transition-colors ${
                  over
                    ? "border-destructive/50 bg-destructive/5"
                    : dragId
                      ? "border-brand/50 bg-brand/5"
                      : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    <Armchair className="h-4 w-4 text-muted-foreground" />
                    {tbl.name}
                  </span>
                  <span
                    className={`flex items-center gap-1 text-xs font-semibold ${
                      over ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    {seats}/{tbl.seats}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {here.length === 0 ? (
                    <p className="py-2 text-center text-[11px] text-muted-foreground">
                      {t("adminReservas.dayDropHere")}
                    </p>
                  ) : (
                    here
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((r) => <ResCard key={r.id} r={r} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
