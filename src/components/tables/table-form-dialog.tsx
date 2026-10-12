import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { TableGlyph } from "@/components/tables/table-glyph";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  TABLE_FEATURES,
  TABLE_SHAPES,
  type RestaurantTable,
  type TableFeature,
  type TableShape,
} from "@/data/tables-store";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

export type TableDraft = {
  name: string;
  seats: number;
  area: string;
  shape: TableShape;
  features: TableFeature[];
  description: string;
  isCombinable: boolean;
  isActive: boolean;
};

const MAX_SEATS = 30;

export function emptyTableDraft(area = "Interior"): TableDraft {
  return {
    name: "",
    seats: 4,
    area,
    shape: "square",
    features: [],
    description: "",
    isCombinable: true,
    isActive: true,
  };
}

export function draftFromTable(tbl: RestaurantTable): TableDraft {
  return {
    name: tbl.name,
    seats: tbl.seats,
    area: tbl.area ?? "",
    shape: tbl.shape ?? "square",
    features: tbl.features ?? [],
    description: tbl.description ?? "",
    isCombinable: tbl.isCombinable !== false,
    isActive: tbl.isActive !== false,
  };
}

/** Contador − / + com o número no meio (mais rápido que um campo numérico
 * no telemóvel). Partilhado com a criação em lote e as junções. */
export function SeatStepper({
  value,
  onChange,
  min = 1,
  max = MAX_SEATS,
  id,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  id?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={t("adminMesas.form.seatsLess")}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
        }}
        className="h-10 w-16 rounded-xl border border-border bg-card text-center font-display text-lg font-bold text-foreground outline-none focus:border-primary"
      />
      <button
        type="button"
        aria-label={t("adminMesas.form.seatsMore")}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function TableFormDialog({
  open,
  onOpenChange,
  editing,
  initial,
  areas,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  initial: TableDraft;
  /** Zonas já usadas no restaurante — sugestões rápidas. */
  areas: string[];
  saving: boolean;
  onSubmit: (draft: TableDraft) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<TableDraft>(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const set = <K extends keyof TableDraft>(key: K, value: TableDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleFeature = (f: TableFeature) => {
    setDraft((d) => {
      const has = d.features.includes(f);
      const features = has ? d.features.filter((x) => x !== f) : [...d.features, f];
      // Cadeiras fixas / sofá quase nunca se juntam a outras mesas —
      // sugere-se, o gestor pode voltar a ligar.
      const fixedNow = !has && (f === "fixed_seats" || f === "sofa");
      return { ...d, features, ...(fixedNow ? { isCombinable: false } : {}) };
    });
  };

  const areaSuggestions = Array.from(
    new Set(["Interior", "Esplanada", ...areas.filter(Boolean)]),
  ).slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 rounded-[1.5rem] border-none bg-card p-0">
        <div className="px-6 pt-6">
          <DialogTitle className="font-display text-lg font-bold">
            {editing ? t("adminMesas.editTitle") : t("adminMesas.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("adminMesas.dialogHint")}</DialogDescription>
        </div>
        <form
          id="table-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(draft);
          }}
          className="mt-4 space-y-5 overflow-y-auto px-6 pb-4"
        >
          <div className="flex items-start gap-4">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-surface">
              <TableGlyph
                shape={draft.shape}
                seats={draft.seats}
                size={76}
                tone={draft.isActive ? "selected" : "off"}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="tbl-name">{t("adminMesas.nameLabel")}</Label>
              <Input
                id="tbl-name"
                value={draft.name}
                maxLength={80}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("adminMesas.form.namePlaceholder")}
                autoFocus={!editing}
              />
              <p className="text-[11px] text-muted-foreground">{t("adminMesas.form.nameHint")}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tbl-seats">{t("adminMesas.seatsLabel")}</Label>
            <SeatStepper id="tbl-seats" value={draft.seats} onChange={(v) => set("seats", v)} />
          </div>

          <div className="space-y-1.5">
            <Label>{t("adminMesas.form.shapeLabel")}</Label>
            <div className="grid grid-cols-5 gap-2" role="radiogroup">
              {TABLE_SHAPES.map((shape) => (
                <button
                  key={shape}
                  type="button"
                  role="radio"
                  aria-checked={draft.shape === shape}
                  onClick={() => set("shape", shape)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-semibold transition-colors",
                    draft.shape === shape
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50",
                  )}
                >
                  <TableGlyph
                    shape={shape}
                    seats={shape === "booth" ? 4 : Math.min(draft.seats, 6)}
                    size={34}
                    tone={draft.shape === shape ? "selected" : "idle"}
                  />
                  {t(`adminMesas.shape.${shape}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tbl-area">{t("adminMesas.areaLabel")}</Label>
            <Input
              id="tbl-area"
              value={draft.area}
              maxLength={80}
              onChange={(e) => set("area", e.target.value)}
              placeholder={t("adminMesas.areaPlaceholder")}
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {areaSuggestions.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => set("area", a)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    draft.area.trim().toLowerCase() === a.toLowerCase()
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("adminMesas.form.featuresLabel")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {TABLE_FEATURES.map((f) => {
                const on = draft.features.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleFeature(f)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      on
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-border text-muted-foreground hover:border-brand/50",
                    )}
                  >
                    {t(`adminMesas.feature.${f}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tbl-desc">{t("adminMesas.form.descriptionLabel")}</Label>
            <Textarea
              id="tbl-desc"
              rows={2}
              maxLength={300}
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={t("adminMesas.form.descriptionPlaceholder")}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <Label htmlFor="tbl-combinable">{t("adminMesas.form.combinableLabel")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("adminMesas.form.combinableHint")}
                </p>
              </div>
              <Switch
                id="tbl-combinable"
                checked={draft.isCombinable}
                onCheckedChange={(v) => set("isCombinable", v)}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <Label htmlFor="tbl-active">{t("adminMesas.form.activeLabel")}</Label>
                <p className="text-xs text-muted-foreground">{t("adminMesas.form.activeHint")}</p>
              </div>
              <Switch
                id="tbl-active"
                checked={draft.isActive}
                onCheckedChange={(v) => set("isActive", v)}
              />
            </div>
          </div>
        </form>
        <div className="border-t border-border px-6 py-4">
          <Button type="submit" form="table-form" className="w-full rounded-full" disabled={saving}>
            {editing ? t("adminMesas.save") : t("adminMesas.create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BulkTablesDialog({
  open,
  onOpenChange,
  nextNumber,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Primeiro número livre (ex.: já há Mesa 1–6 → 7). */
  nextNumber: number;
  saving: boolean;
  onSubmit: (spec: {
    prefix: string;
    start: number;
    count: number;
    seats: number;
    area: string;
    shape: TableShape;
  }) => void;
}) {
  const { t } = useTranslation();
  const [prefix, setPrefix] = useState("Mesa");
  const [start, setStart] = useState(nextNumber);
  const [count, setCount] = useState(6);
  const [seats, setSeats] = useState(4);
  const [area, setArea] = useState("Interior");
  const [shape, setShape] = useState<TableShape>("square");

  useEffect(() => {
    if (open) setStart(nextNumber);
  }, [open, nextNumber]);

  const end = start + count - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[1.5rem] border-none bg-card p-6">
        <DialogTitle className="font-display text-lg font-bold">
          {t("adminMesas.bulk.title")}
        </DialogTitle>
        <DialogDescription>{t("adminMesas.bulk.hint")}</DialogDescription>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              prefix: prefix.trim() || "Mesa",
              start,
              count,
              seats,
              area: area.trim(),
              shape,
            });
          }}
          className="mt-4 space-y-4"
        >
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-prefix">{t("adminMesas.bulk.prefixLabel")}</Label>
              <Input
                id="bulk-prefix"
                value={prefix}
                maxLength={60}
                onChange={(e) => setPrefix(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-start">{t("adminMesas.bulk.startLabel")}</Label>
              <Input
                id="bulk-start"
                type="number"
                min={0}
                value={start}
                onChange={(e) => setStart(Math.max(0, Number(e.target.value) || 0))}
                className="w-24"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("adminMesas.bulk.countLabel")}</Label>
              <SeatStepper value={count} onChange={setCount} max={100} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("adminMesas.seatsLabel")}</Label>
              <SeatStepper value={seats} onChange={setSeats} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-area">{t("adminMesas.areaLabel")}</Label>
            <Input
              id="bulk-area"
              value={area}
              maxLength={80}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-5 gap-2" role="radiogroup">
            {TABLE_SHAPES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={shape === s}
                aria-label={t(`adminMesas.shape.${s}`)}
                onClick={() => setShape(s)}
                className={cn(
                  "grid place-items-center rounded-xl border p-2 transition-colors",
                  shape === s
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                )}
              >
                <TableGlyph
                  shape={s}
                  seats={s === "booth" ? 4 : Math.min(seats, 6)}
                  size={30}
                  tone={shape === s ? "selected" : "idle"}
                />
              </button>
            ))}
          </div>
          <p className="rounded-xl bg-surface p-3 text-center text-sm font-semibold text-foreground">
            {t("adminMesas.bulk.preview", {
              first: `${prefix.trim() || "Mesa"} ${start}`,
              last: `${prefix.trim() || "Mesa"} ${end}`,
              count,
              seats,
            })}
          </p>
          <Button type="submit" className="w-full rounded-full" disabled={saving}>
            {t("adminMesas.bulk.submit", { count })}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
