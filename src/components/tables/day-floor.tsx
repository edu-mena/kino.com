import {
  Armchair,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Combine,
  Link2Off,
  Pencil,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SeatStepper } from "@/components/tables/table-form-dialog";
import { TableGlyph, tableShortLabel, type GlyphTone } from "@/components/tables/table-glyph";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RestaurantTable, TableCombination } from "@/data/tables-store";
import type { Reservation } from "@/data/types";
import { useTranslation, type Locale } from "@/i18n";
import { isOccupying, overlaps } from "@/lib/reservation-occupancy";
import {
  addDaysIso,
  buildDayUnits,
  dayCapacity,
  isTableActive,
  isTableCombinable,
  localIsoDate,
  suggestCombination,
  unitOfTable,
  type FloorUnit,
} from "@/lib/table-layout";
import { cn } from "@/lib/utils";

const BCP47: Record<Locale, string> = { pt: "pt-PT", en: "en-GB", fr: "fr-FR" };

type JoinDraft = { tableIds: string[]; seats: number; label: string; editingId?: string };

/**
 * "Sala do dia" — como a sala fica montada num dia: mesas em serviço por
 * zona, junções desse dia (ex.: 3 + 4 para um grupo), lotação real
 * (lugares e sítios onde sentar grupos) e as reservas que ocupam cada mesa.
 * Juntar/separar aqui vale só para o dia escolhido.
 */
export function DayFloor({
  tables,
  combinations,
  reservations,
  slotMin,
  onCombine,
  onUpdateCombination,
  onSeparate,
  onReactivate,
}: {
  tables: RestaurantTable[];
  combinations: TableCombination[];
  /** Reservas do restaurante (todas) — filtradas aqui ao dia. */
  reservations: Reservation[];
  slotMin: number;
  onCombine: (input: {
    date: string;
    tableIds: string[];
    seats: number;
    label?: string;
  }) => Promise<string | true>;
  onUpdateCombination: (
    id: string,
    patch: { seats: number; label: string },
  ) => Promise<string | true>;
  onSeparate: (id: string) => Promise<boolean>;
  onReactivate: (tableId: string) => void;
}) {
  const { t, locale } = useTranslation();
  const today = localIsoDate();
  const [date, setDate] = useState(today);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [join, setJoin] = useState<JoinDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const units = useMemo(
    () => buildDayUnits(tables, combinations, date),
    [tables, combinations, date],
  );
  const capacity = dayCapacity(units);
  const inactive = tables.filter((tbl) => !isTableActive(tbl));
  const tablesById = useMemo(() => new Map(tables.map((tbl) => [tbl.id, tbl])), [tables]);

  const dayReservations = useMemo(
    () =>
      reservations
        .filter((r) => r.date.slice(0, 10) === date && isOccupying(r.status))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [reservations, date],
  );
  const dayPax = dayReservations.reduce((n, r) => n + r.peopleCount, 0);

  const reservationsByUnit = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of dayReservations) {
      const unit = unitOfTable(units, r.tableId);
      if (!unit) continue;
      map.set(unit.key, [...(map.get(unit.key) ?? []), r]);
    }
    return map;
  }, [dayReservations, units]);

  // Grupos sem mesa que não cabem em nenhuma mesa livre à hora deles →
  // sugestão de junção (só para hoje em diante).
  const suggestions = useMemo(() => {
    if (date < today) return [];
    const out: { reservation: Reservation; tables: RestaurantTable[] }[] = [];
    const usedInSuggestion = new Set<string>();
    for (const r of dayReservations) {
      if (r.tableId) continue;
      const busyKeys = new Set(
        dayReservations
          .filter((x) => x.id !== r.id && x.tableId && overlaps(r, x, slotMin))
          .map((x) => unitOfTable(units, x.tableId)?.key)
          .filter(Boolean) as string[],
      );
      const free = units.filter((u) => !busyKeys.has(u.key));
      if (free.some((u) => u.seats >= r.peopleCount)) continue;
      const freeSingles = free
        .filter((u) => u.kind === "table")
        .map((u) => u.tables[0]!)
        .filter((tbl) => isTableCombinable(tbl) && !usedInSuggestion.has(tbl.id));
      const pick = suggestCombination(r.peopleCount, freeSingles);
      if (pick) {
        pick.forEach((tbl) => usedInSuggestion.add(tbl.id));
        out.push({ reservation: r, tables: pick });
      }
    }
    return out;
  }, [dayReservations, units, slotMin, date, today]);

  const byArea = useMemo(() => {
    const groups = new Map<string, FloorUnit[]>();
    for (const u of units) {
      const key = u.area?.trim() || t("adminMesas.day.noArea");
      groups.set(key, [...(groups.get(key) ?? []), u]);
    }
    return [...groups.entries()];
  }, [units, t]);

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString(BCP47[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const relative =
    date === today
      ? t("adminMesas.day.today")
      : date === addDaysIso(today, 1)
        ? t("adminMesas.day.tomorrow")
        : null;

  const selectedTables = selected
    .map((id) => tablesById.get(id))
    .filter(Boolean) as RestaurantTable[];
  const selectedSeats = selectedTables.reduce((n, tbl) => n + tbl.seats, 0);

  const toggleSelect = (unit: FloorUnit) => {
    if (unit.kind !== "table") return;
    const tbl = unit.tables[0]!;
    if (!isTableCombinable(tbl)) {
      toast.info(t("adminMesas.day.notCombinable", { name: tbl.name }));
      return;
    }
    setSelected((prev) =>
      prev.includes(tbl.id) ? prev.filter((id) => id !== tbl.id) : [...prev, tbl.id],
    );
  };

  const stopSelecting = () => {
    setSelecting(false);
    setSelected([]);
  };

  const submitJoin = async () => {
    if (!join) return;
    setBusy(true);
    const result = join.editingId
      ? await onUpdateCombination(join.editingId, { seats: join.seats, label: join.label.trim() })
      : await onCombine({
          date,
          tableIds: join.tableIds,
          seats: join.seats,
          ...(join.label.trim() ? { label: join.label.trim() } : {}),
        });
    setBusy(false);
    if (result === true) {
      toast.success(
        join.editingId ? t("adminMesas.day.comboUpdatedToast") : t("adminMesas.day.combinedToast"),
      );
      setJoin(null);
      stopSelecting();
      return;
    }
    toast.error(
      result === "clash"
        ? t("adminMesas.day.clashError")
        : result === "error"
          ? t("adminMesas.saveFailedError")
          : result,
    );
  };

  const separate = async (unit: FloorUnit) => {
    if (!unit.combinationId) return;
    const ok = await onSeparate(unit.combinationId);
    if (ok) toast.success(t("adminMesas.day.separatedToast"));
    else toast.error(t("adminMesas.saveFailedError"));
  };

  return (
    <section className="space-y-5">
      {/* Navegação de datas */}
      <div className="card-soft flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("adminMesas.day.prevDay")}
            onClick={() => setDate((d) => addDaysIso(d, -1))}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition-colors hover:border-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 px-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-brand">
              {relative ?? t("adminMesas.day.eyebrow")}
            </p>
            <p className="truncate font-display text-base font-bold capitalize text-foreground sm:text-lg">
              {dateLabel}
            </p>
          </div>
          <button
            type="button"
            aria-label={t("adminMesas.day.nextDay")}
            onClick={() => setDate((d) => addDaysIso(d, 1))}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition-colors hover:border-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {date !== today && (
            <button
              type="button"
              onClick={() => setDate(today)}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {t("adminMesas.day.backToToday")}
            </button>
          )}
          <label className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-border bg-card transition-colors hover:border-primary">
            <CalendarDays className="h-4 w-4" />
            <span className="sr-only">{t("adminMesas.day.pickDate")}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>

      {/* Lotação do dia */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DayStat
          label={t("adminMesas.day.statUnits")}
          value={String(capacity.units)}
          hint={
            capacity.combinations > 0
              ? t("adminMesas.day.statUnitsHintCombined", { tables: capacity.tables })
              : t("adminMesas.day.statUnitsHint")
          }
        />
        <DayStat
          label={t("adminMesas.day.statSeats")}
          value={String(capacity.seats)}
          hint={t("adminMesas.day.statSeatsHint")}
        />
        <DayStat
          label={t("adminMesas.day.statCombos")}
          value={String(capacity.combinations)}
          hint={t("adminMesas.day.statCombosHint")}
        />
        <DayStat
          label={t("adminMesas.day.statReservations")}
          value={String(dayReservations.length)}
          hint={t("adminMesas.day.statReservationsHint", { pax: dayPax })}
          tone={capacity.seats > 0 && dayPax > capacity.seats ? "warn" : "default"}
        />
      </div>

      {/* Sugestões de junção */}
      {suggestions.map(({ reservation: r, tables: pick }) => (
        <div
          key={r.id}
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand/40 bg-brand/5 p-4"
        >
          <Sparkles className="h-5 w-5 shrink-0 text-brand" />
          <p className="min-w-0 flex-1 text-sm text-foreground">
            {t("adminMesas.day.suggestion", {
              pax: r.peopleCount,
              time: r.time,
              name: r.customerName,
              tables: pick.map((tbl) => tbl.name).join(" + "),
            })}
          </p>
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            onClick={() =>
              setJoin({
                tableIds: pick.map((tbl) => tbl.id),
                seats: pick.reduce((n, tbl) => n + tbl.seats, 0),
                label: r.customerName,
              })
            }
          >
            <Combine className="h-4 w-4" /> {t("adminMesas.day.joinThese")}
          </Button>
        </div>
      ))}

      {/* Barra de ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {selecting ? t("adminMesas.day.selectHint") : t("adminMesas.day.floorHint")}
        </p>
        {selecting ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={stopSelecting}
          >
            <X className="h-4 w-4" /> {t("adminMesas.day.cancelSelect")}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            disabled={units.filter((u) => u.kind === "table").length < 2}
            onClick={() => setSelecting(true)}
          >
            <Combine className="h-4 w-4" /> {t("adminMesas.day.combine")}
          </Button>
        )}
      </div>

      {units.length === 0 ? (
        <div className="card-soft grid place-items-center gap-3 p-10 text-center">
          <Armchair className="h-9 w-9 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("adminMesas.day.empty")}</p>
        </div>
      ) : (
        byArea.map(([area, list]) => {
          const seats = list.reduce((n, u) => n + u.seats, 0);
          return (
            <div key={area} className="space-y-3">
              <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                <h3 className="font-display text-base font-bold text-foreground">{area}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("adminMesas.day.areaSummary", { units: list.length, seats })}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {list.map((unit) => (
                  <UnitTile
                    key={unit.key}
                    unit={unit}
                    reservations={reservationsByUnit.get(unit.key) ?? []}
                    selecting={selecting}
                    selected={unit.kind === "table" && selected.includes(unit.anchorTableId)}
                    onToggle={() => toggleSelect(unit)}
                    onSeparate={() => void separate(unit)}
                    onEdit={() =>
                      unit.combinationId &&
                      setJoin({
                        tableIds: unit.tableIds,
                        seats: unit.seats,
                        label: combinations.find((c) => c.id === unit.combinationId)?.label ?? "",
                        editingId: unit.combinationId,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {inactive.length > 0 && (
        <details className="card-soft p-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
            {t("adminMesas.day.inactiveTitle", { count: inactive.length })}
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {inactive.map((tbl) => (
              <button
                key={tbl.id}
                type="button"
                onClick={() => onReactivate(tbl.id)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <TableGlyph shape={tbl.shape} seats={tbl.seats} size={18} tone="off" />
                {tbl.name} · {t("adminMesas.day.reactivate")}
              </button>
            ))}
          </div>
        </details>
      )}

      {/* Barra fixa de seleção */}
      {selecting && selected.length > 0 && (
        <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-xl items-center gap-3 rounded-full border border-border bg-card/95 p-2 pl-5 shadow-xl backdrop-blur">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {t("adminMesas.day.selectedSummary", {
              count: selected.length,
              seats: selectedSeats,
            })}
          </p>
          <Button
            type="button"
            className="rounded-full"
            disabled={selected.length < 2}
            onClick={() => setJoin({ tableIds: selected, seats: selectedSeats, label: "" })}
          >
            <Combine className="h-4 w-4" /> {t("adminMesas.day.combineNow")}
          </Button>
        </div>
      )}

      <Dialog open={join !== null} onOpenChange={(o) => !o && setJoin(null)}>
        <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="font-display text-lg font-bold">
            {join?.editingId ? t("adminMesas.day.editComboTitle") : t("adminMesas.day.joinTitle")}
          </DialogTitle>
          <DialogDescription>
            {join
              ? t("adminMesas.day.joinHint", {
                  tables: join.tableIds
                    .map((id) => tablesById.get(id)?.name)
                    .filter(Boolean)
                    .join(" + "),
                  date: dateLabel,
                })
              : ""}
          </DialogDescription>
          {join && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submitJoin();
              }}
              className="mt-4 space-y-4"
            >
              <div className="flex justify-center gap-1 rounded-2xl bg-surface p-4">
                {join.tableIds.map((id) => {
                  const tbl = tablesById.get(id);
                  return tbl ? (
                    <TableGlyph
                      key={id}
                      shape={tbl.shape}
                      seats={tbl.seats}
                      size={52}
                      tone="combo"
                      label={tableShortLabel(tbl.name)}
                    />
                  ) : null;
                })}
              </div>
              <div className="space-y-1.5">
                <Label>{t("adminMesas.day.joinSeatsLabel")}</Label>
                <SeatStepper
                  value={join.seats}
                  onChange={(v) => setJoin((j) => (j ? { ...j, seats: v } : j))}
                  max={500}
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("adminMesas.day.joinSeatsHint")}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="join-label">{t("adminMesas.day.joinLabelLabel")}</Label>
                <Input
                  id="join-label"
                  value={join.label}
                  maxLength={80}
                  onChange={(e) => setJoin((j) => (j ? { ...j, label: e.target.value } : j))}
                  placeholder={t("adminMesas.day.joinLabelPlaceholder")}
                />
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={busy}>
                {join.editingId ? t("adminMesas.save") : t("adminMesas.day.combineNow")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DayStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="card-soft p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-2xl font-extrabold",
          tone === "warn" ? "text-destructive" : "text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function UnitTile({
  unit,
  reservations,
  selecting,
  selected,
  onToggle,
  onSeparate,
  onEdit,
}: {
  unit: FloorUnit;
  reservations: Reservation[];
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
  onSeparate: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const isCombo = unit.kind === "combo";
  const pax = reservations.reduce((n, r) => n + r.peopleCount, 0);
  const tbl = unit.tables[0]!;
  const selectable = selecting && !isCombo;
  const lockedForCombine = selecting && !isCombo && !isTableCombinable(tbl);
  const tone: GlyphTone = selected
    ? "selected"
    : isCombo
      ? "combo"
      : reservations.length > 0
        ? "busy"
        : "idle";

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-foreground">{unit.name}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {t("adminMesas.seatsValue", { count: unit.seats })}
          </p>
        </div>
        {isCombo ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            {t("adminMesas.day.comboBadge")}
          </span>
        ) : reservations.length > 0 ? (
          <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
            {t("adminMesas.day.reservedBadge", { count: reservations.length })}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
            {t("adminMesas.day.freeBadge")}
          </span>
        )}
      </div>

      <div className="my-3 flex min-h-[64px] items-center justify-center gap-0.5">
        {unit.tables.slice(0, 4).map((m) => (
          <TableGlyph
            key={m.id}
            shape={m.shape}
            seats={m.seats}
            size={unit.tables.length > 2 ? 44 : 60}
            tone={tone}
            label={tableShortLabel(m.name)}
          />
        ))}
        {unit.tables.length > 4 && (
          <span className="text-xs font-bold text-muted-foreground">+{unit.tables.length - 4}</span>
        )}
      </div>

      {!isCombo && (tbl.features?.length || tbl.description) ? (
        <p className="line-clamp-2 text-[11px] text-muted-foreground">
          {[...(tbl.features ?? []).map((f) => t(`adminMesas.feature.${f}`)), tbl.description]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      {reservations.length > 0 && (
        <ul className="mt-2 space-y-1">
          {reservations.slice(0, 3).map((r) => (
            <li
              key={r.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg bg-surface px-2 py-1 text-[11px]",
                r.peopleCount > unit.seats && "text-destructive",
              )}
            >
              <span className="min-w-0 truncate font-semibold">
                {r.time} · {r.customerName}
              </span>
              <span className="shrink-0">{r.peopleCount}p</span>
            </li>
          ))}
          {reservations.length > 3 && (
            <li className="text-center text-[11px] text-muted-foreground">
              {t("adminMesas.day.moreReservations", { count: reservations.length - 3, pax })}
            </li>
          )}
        </ul>
      )}

      {isCombo && !selecting && (
        <div className="mt-3 flex gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-border px-2 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Pencil className="h-3 w-3" /> {t("adminMesas.edit")}
          </button>
          <button
            type="button"
            onClick={onSeparate}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-border px-2 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
          >
            <Link2Off className="h-3 w-3" /> {t("adminMesas.day.separate")}
          </button>
        </div>
      )}
    </>
  );

  const className = cn(
    "rounded-2xl border bg-card p-3 text-left transition-all",
    isCombo ? "col-span-2 border-primary/40 bg-primary/[0.03]" : "border-border",
    selected && "border-primary ring-2 ring-primary/30",
    lockedForCombine && "opacity-50",
    selectable && !lockedForCombine && "cursor-pointer hover:border-primary/60",
  );

  return selectable ? (
    <button type="button" aria-pressed={selected} onClick={onToggle} className={className}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
}
