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
import { ImageUploadField } from "@/components/image-upload-field";
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

type Draft = {
  type: Offer["type"];
  title: string;
  description: string;
  code: string;
  image: string;
  layout: NonNullable<Offer["layout"]>;
  percentOff: string;
};
const emptyDraft: Draft = {
  type: "discount",
  title: "",
  description: "",
  code: "",
  image: "",
  layout: "split",
  percentOff: "",
};

function SistemaPromocoes() {
  const { kinoOffers, createKinoOffer, updateOffer, deleteOffer } = useOffersAdmin();
  const { t } = useTranslation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [uploading, setUploading] = useState(false);
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
      image: offer.image ?? "",
      layout: offer.layout ?? "split",
      percentOff: offer.percentOff ? String(offer.percentOff) : "",
    });
    setDialogOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.description.trim()) return;
    const pct = Math.round(Number(draft.percentOff));
    const input = {
      type: draft.type,
      title: draft.title.trim(),
      description: draft.description.trim(),
      layout: draft.layout,
      image: draft.image.trim(),
      ...(draft.code.trim() ? { code: draft.code.trim().toUpperCase() } : {}),
      ...(draft.type !== "delivery" && pct > 0 ? { percentOff: Math.min(100, pct) } : {}),
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
                  {offer.image ? (
                    <img
                      src={offer.image}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                  )}
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
        <DialogContent className="flex max-h-[88dvh] max-w-lg flex-col gap-0 rounded-[1.5rem] border-none bg-card p-0">
          <div className="px-6 pt-6">
            <DialogTitle className="font-display text-lg font-bold">
              {editing ? t("sistema.promocoes.editTitle") : t("sistema.promocoes.newTitle")}
            </DialogTitle>
            <DialogDescription>{t("sistema.promocoes.dialogHint")}</DialogDescription>
          </div>
          <form
            id="kino-promo-form"
            onSubmit={submit}
            className="mt-3 grid grid-cols-2 gap-3 overflow-y-auto px-6 pb-2"
          >
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
              <Label htmlFor="offer-code">{t("sistema.promocoes.codeLabel")}</Label>
              <Input
                id="offer-code"
                value={draft.code}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                placeholder={t("sistema.promocoes.codePlaceholder")}
              />
            </div>
            {draft.type !== "delivery" && (
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="offer-percent">{t("sistema.promocoes.percentOffLabel")}</Label>
                <Input
                  id="offer-percent"
                  type="number"
                  min={0}
                  max={100}
                  value={draft.percentOff}
                  onChange={(e) => setDraft((d) => ({ ...d, percentOff: e.target.value }))}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground">
                  {t("sistema.promocoes.percentOffHint")}
                </p>
              </div>
            )}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="offer-title">{t("sistema.promocoes.titleLabel")}</Label>
              <Input
                id="offer-title"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="offer-desc">{t("sistema.promocoes.descLabel")}</Label>
              <Textarea
                id="offer-desc"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                rows={2}
                className="rounded-xl"
              />
            </div>
            <div className="col-span-2">
              <ImageUploadField
                value={draft.image}
                onChange={(v) => setDraft((d) => ({ ...d, image: v }))}
                onUploadingChange={setUploading}
                label={t("sistema.promocoes.imageLabel")}
                helpText={t("sistema.promocoes.imageHelp")}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>{t("sistema.promocoes.layoutLabel")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["split", "cover"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, layout: opt }))}
                    aria-pressed={draft.layout === opt}
                    className={`flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-colors ${
                      draft.layout === opt
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-10 gap-1 rounded-md bg-surface p-1 ${
                        opt === "cover" ? "relative" : ""
                      }`}
                    >
                      {opt === "split" ? (
                        <>
                          <span className="h-full w-1/2 rounded bg-primary/30" />
                          <span className="flex h-full w-1/2 flex-col justify-center gap-1">
                            <span className="h-1.5 w-full rounded bg-muted-foreground/30" />
                            <span className="h-1.5 w-2/3 rounded bg-muted-foreground/20" />
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="absolute inset-1 rounded bg-primary/30" />
                          <span className="relative m-auto flex flex-col items-center gap-1">
                            <span className="h-1.5 w-10 rounded bg-white/70" />
                            <span className="h-1.5 w-7 rounded bg-white/50" />
                          </span>
                        </>
                      )}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {opt === "split"
                        ? t("sistema.promocoes.layoutSplit")
                        : t("sistema.promocoes.layoutCover")}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t("sistema.promocoes.layoutHelp")}</p>
            </div>
          </form>
          <div className="border-t border-border px-6 py-4">
            <Button
              type="submit"
              form="kino-promo-form"
              className="w-full rounded-xl"
              disabled={uploading}
            >
              {editing ? t("sistema.promocoes.save") : t("sistema.promocoes.create")}
            </Button>
          </div>
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
