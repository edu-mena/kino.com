import { createFileRoute } from "@tanstack/react-router";
import { Armchair, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeading, RestaurantGate } from "@/components/admin-shell";
import { KpiTile } from "@/components/admin-stats";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveProfileEdits } from "@/data/restaurant-profile-store";
import type { RestaurantTable } from "@/data/tables-store";
import { useTranslation } from "@/i18n";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useTables } from "@/lib/tables";

export const Route = createFileRoute("/admin/mesas")({
  head: () => ({ meta: [{ title: "Sala e mesas — Painel Kino.com" }] }),
  component: () => (
    <RestaurantGate>
      <AdminMesas />
    </RestaurantGate>
  ),
});

const SLOT_OPTIONS = [60, 90, 120, 150, 180];

type Draft = { name: string; seats: string; area: string };
const emptyDraft: Draft = { name: "", seats: "4", area: "Interior" };

function AdminMesas() {
  const { restaurant } = useRestaurantAdmin();
  const { tablesByRestaurant, addTable, updateTable, removeTable } = useTables();
  const { t } = useTranslation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const tables = useMemo(
    () => (restaurant ? tablesByRestaurant(restaurant.id) : []),
    [restaurant, tablesByRestaurant],
  );
  const totalSeats = tables.reduce((sum, tbl) => sum + tbl.seats, 0);

  if (!restaurant) return null;

  const acceptsReservations = restaurant.acceptsReservations ?? true;
  const slotMinutes = restaurant.reservationSlotMinutes ?? 120;

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  };
  const openEdit = (tbl: RestaurantTable) => {
    setEditing(tbl);
    setDraft({ name: tbl.name, seats: String(tbl.seats), area: tbl.area ?? "" });
    setDialogOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const seats = Math.max(1, Number(draft.seats) || 1);
    const area = draft.area.trim();
    const payload = {
      name: draft.name.trim() || t("adminMesas.defaultName"),
      seats,
      ...(area ? { area } : {}),
    };
    if (editing) {
      updateTable(editing.id, payload);
      toast.success(t("adminMesas.updatedToast"));
    } else {
      addTable({ ...payload, restaurantId: restaurant.id });
      toast.success(t("adminMesas.addedToast"));
    }
    setDialogOpen(false);
  };

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminMesas.eyebrow")}
        title={t("adminMesas.title")}
        description={t("adminMesas.description")}
        action={
          <Button type="button" onClick={openCreate} className="rounded-xl">
            <Plus className="h-4 w-4" /> {t("adminMesas.add")}
          </Button>
        }
      />

      <div className="mx-auto mt-6 max-w-4xl space-y-6 px-4 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiTile
            icon={Armchair}
            tone="primary"
            big={false}
            label={t("adminMesas.tableCount")}
            value={String(tables.length)}
            hint={t("adminMesas.tableCountHint")}
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

        {/* Regras de reserva */}
        <div className="card-soft space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>{t("adminMesas.acceptLabel")}</Label>
              <p className="text-xs text-muted-foreground">{t("adminMesas.acceptHint")}</p>
            </div>
            <Switch
              checked={acceptsReservations}
              onCheckedChange={(v) => {
                saveProfileEdits(restaurant.id, { acceptsReservations: v });
                toast.success(t("adminMesas.savedToast"));
              }}
            />
          </div>
          <div>
            <Label>{t("adminMesas.slotLabel")}</Label>
            <p className="text-xs text-muted-foreground">{t("adminMesas.slotHint")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SLOT_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    saveProfileEdits(restaurant.id, { reservationSlotMinutes: m });
                    toast.success(t("adminMesas.savedToast"));
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    slotMinutes === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {t("adminMesas.slotValue", { min: m })}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de mesas */}
        <div className="space-y-2">
          {tables.length === 0 ? (
            <div className="card-soft grid place-items-center gap-3 p-10 text-center">
              <Armchair className="h-9 w-9 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("adminMesas.empty")}</p>
            </div>
          ) : (
            tables.map((tbl) => (
              <div key={tbl.id} className="card-soft flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-muted-foreground">
                  <Armchair className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{tbl.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t("adminMesas.seatsValue", { count: tbl.seats })}
                    {tbl.area ? ` · ${tbl.area}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t("adminMesas.edit")}
                  onClick={() => openEdit(tbl)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("adminMesas.remove")}
                  onClick={() => {
                    removeTable(tbl.id);
                    toast.success(t("adminMesas.removedToast"));
                  }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="font-display text-lg font-bold">
            {editing ? t("adminMesas.editTitle") : t("adminMesas.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("adminMesas.dialogHint")}</DialogDescription>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tbl-name">{t("adminMesas.nameLabel")}</Label>
              <Input
                id="tbl-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder={t("adminMesas.defaultName")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tbl-seats">{t("adminMesas.seatsLabel")}</Label>
                <Input
                  id="tbl-seats"
                  type="number"
                  min={1}
                  max={30}
                  value={draft.seats}
                  onChange={(e) => setDraft((d) => ({ ...d, seats: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tbl-area">{t("adminMesas.areaLabel")}</Label>
                <Input
                  id="tbl-area"
                  value={draft.area}
                  onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))}
                  placeholder={t("adminMesas.areaPlaceholder")}
                />
              </div>
            </div>
            <Button type="submit" className="w-full rounded-xl">
              {editing ? t("adminMesas.save") : t("adminMesas.create")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
