import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Armchair, PartyPopper, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeading, RestaurantGate } from "@/components/admin-shell";
import { KpiTile } from "@/components/admin-stats";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateApiRestaurant } from "@/data/api-restaurants";
import { saveProfileEdits } from "@/data/restaurant-profile-store";
import type { RestaurantTable } from "@/data/tables-store";
import type { RestaurantPackage } from "@/data/types";
import { useTranslation } from "@/i18n";
import { hasRealBackend } from "@/lib/api-client";
import { usePackageTypesAdmin } from "@/lib/package-types";
import { getAdminToken, useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useRestaurantPackages } from "@/lib/restaurant-packages";
import { useTables } from "@/lib/tables";

export const Route = createFileRoute("/admin/mesas")({
  head: () => ({ meta: [{ title: "Sala e mesas — Painel Luku.com" }] }),
  component: () => (
    <RestaurantGate>
      <AdminMesas />
    </RestaurantGate>
  ),
});

const SLOT_OPTIONS = [60, 90, 120, 150, 180];
const CANCEL_WINDOW_OPTIONS = [0, 15, 30, 60, 120];

type Draft = { name: string; seats: string; area: string };
const emptyDraft: Draft = { name: "", seats: "4", area: "Interior" };

type PackageDraft = {
  packageTypeId: string;
  title: string;
  description: string;
  price: string;
  maxPeople: string;
  characteristics: string[];
  isActive: boolean;
};
const emptyPackageDraft: PackageDraft = {
  packageTypeId: "",
  title: "",
  description: "",
  price: "",
  maxPeople: "",
  characteristics: [],
  isActive: true,
};

function AdminMesas() {
  const { restaurant } = useRestaurantAdmin();
  const { tablesByRestaurant, addTable, updateTable, removeTable } = useTables();
  const { packageTypes } = usePackageTypesAdmin();
  const { packagesByRestaurant, addPackage, updatePackage, removePackage } =
    useRestaurantPackages();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const adminToken = getAdminToken();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const [pkgDialogOpen, setPkgDialogOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<RestaurantPackage | null>(null);
  const [pkgDraft, setPkgDraft] = useState<PackageDraft>(emptyPackageDraft);
  const [pkgCharInput, setPkgCharInput] = useState("");
  const [savingPkg, setSavingPkg] = useState(false);

  const tables = useMemo(
    () => (restaurant ? tablesByRestaurant(restaurant.id) : []),
    [restaurant, tablesByRestaurant],
  );
  const totalSeats = tables.reduce((sum, tbl) => sum + tbl.seats, 0);

  const activePackageTypes = packageTypes.filter((pt) => pt.isActive);
  const packages = useMemo(
    () => (restaurant ? packagesByRestaurant(restaurant.id) : []),
    [restaurant, packagesByRestaurant],
  );

  if (!restaurant) return null;

  const acceptsReservations = restaurant.acceptsReservations ?? true;
  const slotMinutes = restaurant.reservationSlotMinutes ?? 120;
  const cancelWindowMinutes = restaurant.reservationCancellationWindowMinutes ?? 30;

  // Antes gravava sempre em `saveProfileEdits` (mock/localStorage), mesmo
  // com backend real — o toast de sucesso disparava sem nada ser de facto
  // persistido, então o toggle "reverte" ao recarregar. Mesmo padrão de
  // `admin.perfil.tsx`: com backend real, PATCH de verdade + invalida a
  // query do restaurante; sem backend, mantém o mock de sempre.
  const saveReservationSetting = async (
    patch:
      | { acceptsReservations: boolean }
      | { reservationSlotMinutes: number }
      | { reservationCancellationWindowMinutes: number },
  ) => {
    if (hasRealBackend) {
      if (!adminToken) {
        toast.error(t("adminMesas.saveFailedError"));
        return;
      }
      try {
        await updateApiRestaurant(restaurant.id, patch, adminToken);
        await queryClient.invalidateQueries({ queryKey: ["restaurant", restaurant.id] });
        toast.success(t("adminMesas.savedToast"));
      } catch {
        toast.error(t("adminMesas.saveFailedError"));
      }
      return;
    }
    saveProfileEdits(restaurant.id, patch);
    toast.success(t("adminMesas.savedToast"));
  };

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

  const openCreatePkg = () => {
    setEditingPkg(null);
    setPkgDraft(emptyPackageDraft);
    setPkgCharInput("");
    setPkgDialogOpen(true);
  };
  const openEditPkg = (pkg: RestaurantPackage) => {
    setEditingPkg(pkg);
    setPkgDraft({
      packageTypeId: pkg.packageType.id,
      title: pkg.title ?? "",
      description: pkg.description ?? "",
      price: String(pkg.price),
      maxPeople: pkg.maxPeople != null ? String(pkg.maxPeople) : "",
      characteristics: pkg.characteristics,
      isActive: pkg.isActive,
    });
    setPkgCharInput("");
    setPkgDialogOpen(true);
  };

  const addCharacteristic = () => {
    const value = pkgCharInput.trim();
    if (!value) return;
    setPkgDraft((d) => ({ ...d, characteristics: [...d.characteristics, value] }));
    setPkgCharInput("");
  };
  const removeCharacteristic = (index: number) => {
    setPkgDraft((d) => ({
      ...d,
      characteristics: d.characteristics.filter((_, i) => i !== index),
    }));
  };

  const submitPkg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    const price = Number(pkgDraft.price);
    if (!pkgDraft.packageTypeId || !price || price <= 0) {
      toast.error(t("adminMesas.packages.missingFieldsError"));
      return;
    }
    const input = {
      packageTypeId: pkgDraft.packageTypeId,
      ...(pkgDraft.title.trim() ? { title: pkgDraft.title.trim() } : {}),
      ...(pkgDraft.description.trim() ? { description: pkgDraft.description.trim() } : {}),
      price,
      ...(pkgDraft.maxPeople.trim() ? { maxPeople: Number(pkgDraft.maxPeople) } : {}),
      characteristics: pkgDraft.characteristics,
      isActive: pkgDraft.isActive,
    };
    setSavingPkg(true);
    const ok = editingPkg
      ? await updatePackage(editingPkg.id, restaurant.id, input)
      : await addPackage(restaurant.id, input);
    setSavingPkg(false);
    if (!ok) {
      toast.error(t("adminMesas.packages.saveFailedError"));
      return;
    }
    toast.success(
      editingPkg ? t("adminMesas.packages.updatedToast") : t("adminMesas.packages.addedToast"),
    );
    setPkgDialogOpen(false);
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
              onCheckedChange={(v) => void saveReservationSetting({ acceptsReservations: v })}
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
                  onClick={() => void saveReservationSetting({ reservationSlotMinutes: m })}
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
          <div>
            <Label>{t("adminMesas.cancelWindowLabel")}</Label>
            <p className="text-xs text-muted-foreground">{t("adminMesas.cancelWindowHint")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CANCEL_WINDOW_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    void saveReservationSetting({ reservationCancellationWindowMinutes: m })
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    cancelWindowMinutes === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {m === 0
                    ? t("adminMesas.cancelWindowOff")
                    : t("adminMesas.slotValue", { min: m })}
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

        {/* Pacotes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                {t("adminMesas.packages.sectionTitle")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("adminMesas.packages.sectionHint")}
              </p>
            </div>
            <Button type="button" size="sm" onClick={openCreatePkg} className="rounded-xl">
              <Plus className="h-4 w-4" /> {t("adminMesas.packages.add")}
            </Button>
          </div>

          {packages.length === 0 ? (
            <div className="card-soft grid place-items-center gap-3 p-10 text-center">
              <PartyPopper className="h-9 w-9 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("adminMesas.packages.empty")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {packages.map((pkg) => (
                <div key={pkg.id} className="card-soft flex items-start gap-3 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-muted-foreground">
                    <PartyPopper className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {pkg.title || pkg.packageType.name}
                      </p>
                      {!pkg.isActive && (
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {t("adminMesas.packages.inactiveBadge")}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {pkg.packageType.name}
                      {pkg.maxPeople
                        ? ` · ${t("adminMesas.packages.maxPeopleValue", { count: pkg.maxPeople })}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={t("adminMesas.edit")}
                    onClick={() => openEditPkg(pkg)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("adminMesas.remove")}
                    onClick={async () => {
                      const ok = await removePackage(pkg.id);
                      if (!ok) {
                        toast.error(t("adminMesas.packages.removeFailedError"));
                        return;
                      }
                      toast.success(t("adminMesas.packages.removedToast"));
                    }}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
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

      <Dialog open={pkgDialogOpen} onOpenChange={setPkgDialogOpen}>
        <DialogContent className="flex max-h-[88dvh] max-w-lg flex-col gap-0 rounded-[1.5rem] border-none bg-card p-0">
          <div className="px-6 pt-6">
            <DialogTitle className="font-display text-lg font-bold">
              {editingPkg ? t("adminMesas.packages.editTitle") : t("adminMesas.packages.addTitle")}
            </DialogTitle>
            <DialogDescription>{t("adminMesas.packages.dialogHint")}</DialogDescription>
          </div>
          <form
            id="restaurant-package-form"
            onSubmit={submitPkg}
            className="mt-3 space-y-3 overflow-y-auto px-6 pb-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="pkg-type">{t("adminMesas.packages.typeLabel")}</Label>
              {activePackageTypes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("adminMesas.packages.noTypesAvailable")}
                </p>
              ) : (
                <Select
                  value={pkgDraft.packageTypeId}
                  onValueChange={(v) => setPkgDraft((d) => ({ ...d, packageTypeId: v }))}
                >
                  <SelectTrigger id="pkg-type" className="rounded-xl">
                    <SelectValue placeholder={t("adminMesas.packages.typePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activePackageTypes.map((pt) => (
                      <SelectItem key={pt.id} value={pt.id}>
                        {pt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-title">{t("adminMesas.packages.titleLabel")}</Label>
              <Input
                id="pkg-title"
                value={pkgDraft.title}
                onChange={(e) => setPkgDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder={t("adminMesas.packages.titlePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-desc">{t("adminMesas.packages.descLabel")}</Label>
              <Textarea
                id="pkg-desc"
                value={pkgDraft.description}
                onChange={(e) => setPkgDraft((d) => ({ ...d, description: e.target.value }))}
                rows={2}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pkg-price">{t("adminMesas.packages.priceLabel")}</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  min={1}
                  step="any"
                  value={pkgDraft.price}
                  onChange={(e) => setPkgDraft((d) => ({ ...d, price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pkg-max-people">{t("adminMesas.packages.maxPeopleLabel")}</Label>
                <Input
                  id="pkg-max-people"
                  type="number"
                  min={1}
                  value={pkgDraft.maxPeople}
                  onChange={(e) => setPkgDraft((d) => ({ ...d, maxPeople: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-characteristic">
                {t("adminMesas.packages.characteristicsLabel")}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="pkg-characteristic"
                  value={pkgCharInput}
                  onChange={(e) => setPkgCharInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCharacteristic();
                    }
                  }}
                  placeholder={t("adminMesas.packages.characteristicsPlaceholder")}
                />
                <Button type="button" variant="outline" onClick={addCharacteristic}>
                  {t("adminMesas.packages.addCharacteristic")}
                </Button>
              </div>
              {pkgDraft.characteristics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {pkgDraft.characteristics.map((c, i) => (
                    <span
                      key={`${c}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      {c}
                      <button
                        type="button"
                        aria-label={t("adminMesas.packages.removeCharacteristicAria", {
                          name: c,
                        })}
                        onClick={() => removeCharacteristic(i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {editingPkg && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div>
                  <Label htmlFor="pkg-active">{t("adminMesas.packages.activeLabel")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("adminMesas.packages.activeHint")}
                  </p>
                </div>
                <Switch
                  id="pkg-active"
                  checked={pkgDraft.isActive}
                  onCheckedChange={(v) => setPkgDraft((d) => ({ ...d, isActive: v }))}
                />
              </div>
            )}
          </form>
          <div className="border-t border-border px-6 py-4">
            <Button
              type="submit"
              form="restaurant-package-form"
              className="w-full rounded-xl"
              disabled={savingPkg}
            >
              {editingPkg ? t("adminMesas.packages.save") : t("adminMesas.packages.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
