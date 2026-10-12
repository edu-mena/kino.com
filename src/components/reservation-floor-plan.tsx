import { Check, Combine, GripVertical, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { TableGlyph, tableShortLabel } from "@/components/tables/table-glyph";
import type { RestaurantTable, TableCombination } from "@/data/tables-store";
import type { Reservation } from "@/data/types";
import { useTranslation } from "@/i18n";
import { isOccupying, overlaps } from "@/lib/reservation-occupancy";
import { buildDayUnits, localIsoDate, unitOfTable } from "@/lib/table-layout";

/**
 * Planta do dia: reservas sem mesa à esquerda (arrastáveis), mesas do dia
 * à direita (drop zones) — com as junções desse dia como UMA mesa (ver
 * `/admin/mesas` → "Sala do dia"). Arrastar uma reserva para uma mesa
 * atribui-a (numa junção, fica gravada na mesa âncora); largar em "Sem
 * mesa" limpa. Em toque, o `<select>` de cada cartão é o fallback (DnD
 * nativo não funciona bem em touch).
 */
export function ReservationFloorPlan({
  reservations,
  tables,
  combinations,
  slotMin,
  totalSeats,
  onAssign,
  onConfirm,
}: {
  reservations: Reservation[];
  tables: RestaurantTable[];
  combinations: TableCombination[];
  slotMin: number;
  totalSeats: number;
  onAssign: (id: string, tableId?: string) => void;
  onConfirm: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [dateStr, setDateStr] = useState(() => localIsoDate());
  const [dragId, setDragId] = useState<string | null>(null);

  const units = useMemo(
    () => buildDayUnits(tables, combinations, dateStr),
    [tables, combinations, dateStr],
  );
  const daySeats = units.reduce((n, u) => n + u.seats, 0);

  const dayReservations = useMemo(
    () =>
      reservations
        .filter((r) => r.date.slice(0, 10) === dateStr && isOccupying(r.status))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [reservations, dateStr],
  );
  // Sem mesa = sem mesa nenhuma, ou numa mesa que hoje está fora de serviço.
  const unassigned = dayReservations.filter((r) => !unitOfTable(units, r.tableId));
  const dayPax = dayReservations.reduce((s, r) => s + r.peopleCount, 0);

  const drop = (tableId?: string) => {
    if (dragId) onAssign(dragId, tableId);
    setDragId(null);
  };

  const ResCard = ({ r }: { r: Reservation }) => {
    const current = unitOfTable(units, r.tableId);
    return (
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
            value={current?.anchorTableId ?? ""}
            onChange={(e) => onAssign(r.id, e.target.value || undefined)}
            className="min-w-0 flex-1 rounded border border-border bg-card px-1.5 py-1 text-[11px] text-foreground outline-none focus:border-brand"
          >
            <option value="">{t("adminReservas.tableNone")}</option>
            {units.map((u) => (
              <option key={u.key} value={u.anchorTableId}>
                {u.name} · {u.seats}
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
  };

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
          seats: dayPax,
          total: daySeats || totalSeats || "—",
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

        {/* Mesas do dia (junções contam como uma) */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {units.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("adminReservas.dayNoTables")}</p>
          )}
          {units.map((unit) => {
            const here = dayReservations.filter(
              (r) => unitOfTable(units, r.tableId)?.key === unit.key,
            );
            const seats = here.reduce((s, r) => s + r.peopleCount, 0);
            const clash = here.some((a, i) =>
              here.some((b, j) => i !== j && overlaps(a, b, slotMin)),
            );
            const over = here.some((r) => r.peopleCount > unit.seats) || clash;
            return (
              <div
                key={unit.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(unit.anchorTableId)}
                className={`rounded-xl border p-3 transition-colors ${
                  over
                    ? "border-destructive/50 bg-destructive/5"
                    : dragId
                      ? "border-brand/50 bg-brand/5"
                      : unit.kind === "combo"
                        ? "border-primary/40 bg-primary/[0.03]"
                        : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-foreground">
                    {unit.kind === "combo" ? (
                      <Combine className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <TableGlyph
                        shape={unit.tables[0]!.shape}
                        seats={unit.seats}
                        size={20}
                        label={tableShortLabel(unit.name)}
                      />
                    )}
                    <span className="truncate">{unit.name}</span>
                  </span>
                  <span
                    className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${
                      over ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    {seats}/{unit.seats}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {here.length === 0 ? (
                    <p className="py-2 text-center text-[11px] text-muted-foreground">
                      {t("adminReservas.dayDropHere")}
                    </p>
                  ) : (
                    here.map((r) => <ResCard key={r.id} r={r} />)
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
