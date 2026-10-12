import { Armchair, ArrowDown, ArrowUp, Layers, Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TableGlyph, tableShortLabel } from "@/components/tables/table-glyph";
import {
  BulkTablesDialog,
  TableFormDialog,
  draftFromTable,
  emptyTableDraft,
  type TableDraft,
} from "@/components/tables/table-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { RestaurantTable } from "@/data/tables-store";
import { useTranslation } from "@/i18n";
import { useTables } from "@/lib/tables";
import { cn } from "@/lib/utils";

/** Maior número no fim de um nome ("Mesa 12" → 12) — para sugerir o
 * próximo na criação em lote. */
function trailingNumber(name: string): number {
  return Number(name.match(/(\d+)\s*$/)?.[1] ?? 0);
}

/**
 * Separador "Mesas" — a configuração permanente da sala: cada mesa com
 * lugares, forma, zona, características, descrição, se pode ser junta e se
 * está em serviço. A ordem aqui é a ordem da planta e da folha de QR.
 */
export function TablesManager({
  restaurantId,
  tables,
  onShowQr,
}: {
  restaurantId: string;
  tables: RestaurantTable[];
  onShowQr: (tableId: string) => void;
}) {
  const { t } = useTranslation();
  const { addTable, addTablesBulk, updateTable, removeTable, reorderTables } = useTables();
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [initial, setInitial] = useState<TableDraft>(() => emptyTableDraft());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<RestaurantTable | null>(null);

  const areas = useMemo(
    () => Array.from(new Set(tables.map((tbl) => tbl.area?.trim()).filter(Boolean))) as string[],
    [tables],
  );
  const nextNumber = tables.reduce((max, tbl) => Math.max(max, trailingNumber(tbl.name)), 0) + 1;

  const openCreate = () => {
    setEditing(null);
    setInitial({ ...emptyTableDraft(areas[0] ?? "Interior"), name: `Mesa ${nextNumber}` });
    setFormOpen(true);
  };
  const openEdit = (tbl: RestaurantTable) => {
    setEditing(tbl);
    setInitial(draftFromTable(tbl));
    setFormOpen(true);
  };

  const submit = async (draft: TableDraft) => {
    const payload = {
      name: draft.name.trim() || `Mesa ${nextNumber}`,
      seats: Math.max(1, draft.seats),
      area: draft.area.trim(),
      shape: draft.shape,
      features: draft.features,
      description: draft.description.trim(),
      isCombinable: draft.isCombinable,
      isActive: draft.isActive,
    };
    setSaving(true);
    const ok = editing
      ? await updateTable(editing.id, payload)
      : (await addTable({ ...payload, restaurantId })) !== null;
    setSaving(false);
    if (!ok) {
      toast.error(t("adminMesas.saveFailedError"));
      return;
    }
    toast.success(editing ? t("adminMesas.updatedToast") : t("adminMesas.addedToast"));
    setFormOpen(false);
  };

  const move = async (index: number, delta: -1 | 1) => {
    const ids = tables.map((tbl) => tbl.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    const ok = await reorderTables(restaurantId, ids);
    if (!ok) toast.error(t("adminMesas.saveFailedError"));
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const ok = await removeTable(deleting.id);
    setDeleting(null);
    if (ok) toast.success(t("adminMesas.removedToast"));
    else toast.error(t("adminMesas.saveFailedError"));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">{t("adminMesas.list.hint")}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => setBulkOpen(true)}
          >
            <Layers className="h-4 w-4" /> {t("adminMesas.bulk.open")}
          </Button>
          <Button type="button" className="rounded-full" onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t("adminMesas.add")}
          </Button>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="card-soft grid place-items-center gap-3 p-10 text-center">
          <Armchair className="h-9 w-9 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("adminMesas.empty")}</p>
          <Button type="button" className="rounded-full" onClick={() => setBulkOpen(true)}>
            <Layers className="h-4 w-4" /> {t("adminMesas.bulk.open")}
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {tables.map((tbl, index) => {
            const active = tbl.isActive !== false;
            return (
              <li
                key={tbl.id}
                className={cn(
                  "card-soft flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:p-4",
                  !active && "opacity-60",
                )}
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label={t("adminMesas.list.moveUp")}
                    disabled={index === 0}
                    onClick={() => void move(index, -1)}
                    className="grid h-6 w-6 place-items-center rounded text-muted-foreground transition-colors hover:text-primary disabled:opacity-25"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("adminMesas.list.moveDown")}
                    disabled={index === tables.length - 1}
                    onClick={() => void move(index, 1)}
                    className="grid h-6 w-6 place-items-center rounded text-muted-foreground transition-colors hover:text-primary disabled:opacity-25"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-surface">
                  <TableGlyph
                    shape={tbl.shape}
                    seats={tbl.seats}
                    size={46}
                    tone={active ? "idle" : "off"}
                    label={tableShortLabel(tbl.name)}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-sm font-bold text-foreground">{tbl.name}</p>
                    {tbl.isCombinable === false && (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {t("adminMesas.list.notCombinableBadge")}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {t("adminMesas.seatsValue", { count: tbl.seats })}
                    {tbl.area ? ` · ${tbl.area}` : ""}
                    {` · ${t(`adminMesas.shape.${tbl.shape ?? "square"}`)}`}
                  </p>
                  {(tbl.features?.length || tbl.description) && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                      {[
                        ...(tbl.features ?? []).map((f) => t(`adminMesas.feature.${f}`)),
                        tbl.description,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <label className="mr-1 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                    <span className="hidden sm:inline">{t("adminMesas.list.inService")}</span>
                    <Switch
                      checked={active}
                      aria-label={t("adminMesas.list.inService")}
                      onCheckedChange={async (v) => {
                        const ok = await updateTable(tbl.id, { isActive: v });
                        if (!ok) toast.error(t("adminMesas.saveFailedError"));
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={t("adminMesas.list.qr")}
                    onClick={() => onShowQr(tbl.id)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("adminMesas.edit")}
                    onClick={() => openEdit(tbl)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("adminMesas.remove")}
                    onClick={() => setDeleting(tbl)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <TableFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing !== null}
        initial={initial}
        areas={areas}
        saving={saving}
        onSubmit={(d) => void submit(d)}
      />

      <BulkTablesDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        nextNumber={nextNumber}
        saving={saving}
        onSubmit={async (spec) => {
          setSaving(true);
          const created = await addTablesBulk(restaurantId, {
            ...spec,
            ...(spec.area ? { area: spec.area } : {}),
          });
          setSaving(false);
          if (!created) {
            toast.error(t("adminMesas.saveFailedError"));
            return;
          }
          toast.success(t("adminMesas.bulk.createdToast", { count: created.length }));
          setBulkOpen(false);
        }}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("adminMesas.list.deleteTitle", { name: deleting?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminMesas.list.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              {t("adminMesas.list.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
