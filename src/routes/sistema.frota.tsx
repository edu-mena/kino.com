import { createFileRoute } from "@tanstack/react-router";
import { Bike, Pencil, Phone, Plus, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import { KpiTile } from "@/components/admin-stats";
import { SystemPageHeading } from "@/components/system-shell";
import { useTranslation } from "@/i18n";
import { useCouriers, type Courier, type CourierStatus, type CourierVehicle } from "@/lib/couriers";

export const Route = createFileRoute("/sistema/frota")({
  head: () => ({ meta: [{ title: "Frota — Sistema Kino.com" }] }),
  component: SistemaFrota,
});

const VEHICLES: CourierVehicle[] = ["moto", "bicicleta", "carro"];

const statusTone: Record<CourierStatus, string> = {
  disponivel: "bg-success/15 text-success",
  em_entrega: "bg-primary/15 text-primary",
  offline: "bg-muted-foreground/15 text-muted-foreground",
};

type Draft = { name: string; phone: string; vehicle: CourierVehicle; zone: string };
const emptyDraft: Draft = { name: "", phone: "", vehicle: "moto", zone: "Luanda" };

function SistemaFrota() {
  const { couriers, addCourier, updateCourier, removeCourier, setStatus } = useCouriers();
  const { t } = useTranslation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Courier | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const vehicleLabels = useMemo<Record<CourierVehicle, string>>(
    () => ({
      moto: t("sistema.frota.vehMoto"),
      bicicleta: t("sistema.frota.vehBike"),
      carro: t("sistema.frota.vehCar"),
    }),
    [t],
  );
  const statusLabels = useMemo<Record<CourierStatus, string>>(
    () => ({
      disponivel: t("sistema.frota.statusFree"),
      em_entrega: t("sistema.frota.statusBusy"),
      offline: t("sistema.frota.statusOffline"),
    }),
    [t],
  );

  const counts = useMemo(() => {
    const c: Record<CourierStatus, number> = { disponivel: 0, em_entrega: 0, offline: 0 };
    for (const courier of couriers) c[courier.status] += 1;
    return c;
  }, [couriers]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  };
  const openEdit = (courier: Courier) => {
    setEditing(courier);
    setDraft({
      name: courier.name,
      phone: courier.phone,
      vehicle: courier.vehicle,
      zone: courier.zone,
    });
    setDialogOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.phone.trim()) return;
    const payload = {
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      vehicle: draft.vehicle,
      zone: draft.zone.trim() || "Luanda",
    };
    if (editing) {
      updateCourier(editing.id, payload);
      toast.success(t("sistema.frota.updatedToast"));
    } else {
      addCourier(payload);
      toast.success(t("sistema.frota.addedToast"));
    }
    setDialogOpen(false);
  };

  return (
    <div className="pb-16">
      <SystemPageHeading
        eyebrow={t("sistema.frota.eyebrow")}
        title={t("sistema.frota.title")}
        description={t("sistema.frota.description")}
        action={
          <Button type="button" onClick={openCreate} className="rounded-xl">
            <Plus className="h-4 w-4" /> {t("sistema.frota.add")}
          </Button>
        }
      />

      <div className="mx-auto mt-6 max-w-4xl px-4 md:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiTile
            icon={Bike}
            tone="success"
            big={false}
            label={t("sistema.frota.statusFree")}
            value={String(counts.disponivel)}
            hint={t("sistema.frota.freeHint")}
          />
          <KpiTile
            icon={Bike}
            tone="primary"
            big={false}
            label={t("sistema.frota.statusBusy")}
            value={String(counts.em_entrega)}
            hint={t("sistema.frota.busyHint")}
          />
          <KpiTile
            icon={Bike}
            tone="muted"
            big={false}
            label={t("sistema.frota.statusOffline")}
            value={String(counts.offline)}
            hint={t("sistema.frota.offlineHint")}
          />
        </div>

        <div className="mt-6 space-y-2">
          {couriers.map((courier) => (
            <div key={courier.id} className="card-soft flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-muted-foreground">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{courier.name}</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  {vehicleLabels[courier.vehicle]} · {courier.zone} · <Phone className="h-3 w-3" />
                  {courier.phone}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${statusTone[courier.status]}`}
              >
                {statusLabels[courier.status]}
              </span>
              {courier.status !== "em_entrega" && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setStatus(courier.id, courier.status === "offline" ? "disponivel" : "offline")
                    }
                    className="shrink-0 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                  >
                    {courier.status === "offline"
                      ? t("sistema.frota.activate")
                      : t("sistema.frota.deactivate")}
                  </button>
                  <button
                    type="button"
                    aria-label={t("sistema.frota.edit")}
                    onClick={() => openEdit(courier)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("sistema.frota.remove")}
                    onClick={() => {
                      removeCourier(courier.id);
                      toast.success(t("sistema.frota.removedToast"));
                    }}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="font-display text-lg font-bold">
            {editing ? t("sistema.frota.editTitle") : t("sistema.frota.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("sistema.frota.dialogHint")}</DialogDescription>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cour-name">{t("sistema.frota.nameLabel")}</Label>
              <Input
                id="cour-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cour-phone">{t("sistema.frota.phoneLabel")}</Label>
                <Input
                  id="cour-phone"
                  value={draft.phone}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cour-zone">{t("sistema.frota.zoneLabel")}</Label>
                <Input
                  id="cour-zone"
                  value={draft.zone}
                  onChange={(e) => setDraft((d) => ({ ...d, zone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("sistema.frota.vehicleLabel")}</Label>
              <Select
                value={draft.vehicle}
                onValueChange={(v) => setDraft((d) => ({ ...d, vehicle: v as CourierVehicle }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {vehicleLabels[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full rounded-xl">
              {editing ? t("sistema.frota.save") : t("sistema.frota.create")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
