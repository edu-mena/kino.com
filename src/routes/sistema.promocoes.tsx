import { createFileRoute } from "@tanstack/react-router";
import { Bike, Megaphone, Pencil, Percent, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { SystemPageHeading } from "@/components/system-shell";
import type { Offer } from "@/data/types";
import { translateOffer, useTranslation } from "@/i18n";
import { useOffersAdmin } from "@/lib/offers-admin";

export const Route = createFileRoute("/sistema/promocoes")({
  head: () => ({ meta: [{ title: "Promoções Kino — Sistema Kino.com" }] }),
  component: SistemaPromocoes,
});

const OFFER_TYPES: Offer["type"][] = ["discount", "delivery", "happy-hour"];
const iconByType = { discount: Percent, delivery: Bike, "happy-hour": Sparkles } as const;

type Draft = { type: Offer["type"]; title: string; description: string; code: string };
const emptyDraft: Draft = { type: "discount", title: "", description: "", code: "" };

function SistemaPromocoes() {
  const { kinoOffers, createKinoOffer, updateOffer, deleteOffer } = useOffersAdmin();
  const { t } = useTranslation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [toDelete, setToDelete] = useState<Offer | null>(null);

  const typeLabels = useMemo<Record<Offer["type"], string>>(
    () => ({
      discount: t("sistema.promocoes.typeDiscount"),
      delivery: t("sistema.promocoes.typeDelivery"),
      "happy-hour": t("sistema.promocoes.typeHappyHour"),
    }),
    [t],
  );

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  };
  const openEdit = (offer: Offer) => {
    setEditing(offer);
    setDraft({
      type: offer.type,
      title: offer.title,
      description: offer.description,
      code: offer.code ?? "",
    });
    setDialogOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.description.trim()) return;
    const input = {
      type: draft.type,
      title: draft.title.trim(),
      description: draft.description.trim(),
      ...(draft.code.trim() ? { code: draft.code.trim().toUpperCase() } : {}),
    };
    if (editing) {
      updateOffer(editing.id, input);
      toast.success(t("sistema.promocoes.updatedToast"));
    } else {
      createKinoOffer(input);
      toast.success(t("sistema.promocoes.createdToast"));
    }
    setDialogOpen(false);
  };

  return (
    <div className="pb-16">
      <SystemPageHeading
        eyebrow={t("sistema.promocoes.eyebrow")}
        title={t("sistema.promocoes.title")}
        description={t("sistema.promocoes.description")}
        action={
          <Button type="button" onClick={openCreate} className="rounded-xl">
            <Plus className="h-4 w-4" /> {t("sistema.promocoes.new")}
          </Button>
        }
      />

      <div className="mx-auto mt-8 max-w-4xl px-4 md:px-6">
        {kinoOffers.length === 0 ? (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("sistema.promocoes.empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {kinoOffers.map((offer) => {
              const Icon = iconByType[offer.type];
              const display = translateOffer(offer, t);
              return (
                <div key={offer.id} className="card-soft flex items-start gap-4 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-bold text-foreground">
                        {display.title}
                      </p>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {typeLabels[offer.type]}
                      </span>
                      {offer.code && (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
                          {offer.code}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{display.description}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label={t("sistema.promocoes.edit")}
                      onClick={() => openEdit(offer)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("sistema.promocoes.delete")}
                      onClick={() => setToDelete(offer)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="font-display text-lg font-bold">
            {editing ? t("sistema.promocoes.editTitle") : t("sistema.promocoes.newTitle")}
          </DialogTitle>
          <DialogDescription>{t("sistema.promocoes.dialogHint")}</DialogDescription>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>{t("sistema.promocoes.typeLabel")}</Label>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft((d) => ({ ...d, type: v as Offer["type"] }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFER_TYPES.map((ty) => (
                    <SelectItem key={ty} value={ty}>
                      {typeLabels[ty]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offer-title">{t("sistema.promocoes.titleLabel")}</Label>
              <Input
                id="offer-title"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offer-desc">{t("sistema.promocoes.descLabel")}</Label>
              <Textarea
                id="offer-desc"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offer-code">{t("sistema.promocoes.codeLabel")}</Label>
              <Input
                id="offer-code"
                value={draft.code}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                placeholder={t("sistema.promocoes.codePlaceholder")}
              />
            </div>
            <Button type="submit" className="w-full rounded-xl">
              {editing ? t("sistema.promocoes.save") : t("sistema.promocoes.create")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sistema.promocoes.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("sistema.promocoes.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) {
                  deleteOffer(toDelete.id);
                  toast.success(t("sistema.promocoes.deletedToast"));
                }
                setToDelete(null);
              }}
            >
              {t("sistema.promocoes.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
