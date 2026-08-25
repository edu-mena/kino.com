import { createFileRoute } from "@tanstack/react-router";
import { Bike, Pencil, Percent, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { AdminPageHeading } from "@/components/admin-shell";
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
import { FirstUseHint } from "@/components/first-use-hint";
import type { Offer } from "@/data/types";
import { useTranslation } from "@/i18n";
import { useFirstUseHint } from "@/lib/first-use-hints";
import { useOffersAdmin } from "@/lib/offers-admin";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/promocoes")({
  head: () => ({ meta: [{ title: "Promoções — Painel Kino.com" }] }),
  component: AdminPromocoes,
});

const iconByType = { discount: Percent, delivery: Bike, "happy-hour": Sparkles } as const;

function AdminPromocoes() {
  const { restaurant } = useRestaurantAdmin();
  const { offersByRestaurant, createOffer, updateOffer, deleteOffer } = useOffersAdmin();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [deleting, setDeleting] = useState<Offer | null>(null);
  const { t } = useTranslation();
  const promoHint = useFirstUseHint("promo");

  const typeLabels: Record<Offer["type"], string> = {
    discount: t("adminPromocoes.typeDiscount"),
    delivery: t("adminPromocoes.typeDelivery"),
    "happy-hour": t("adminPromocoes.typeHappyHour"),
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Offer["type"]>("discount");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!formOpen) return;
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setType(editing?.type ?? "discount");
    setCode(editing?.code ?? "");
  }, [formOpen, editing]);

  if (!restaurant) return null;

  const offers = offersByRestaurant(restaurant.id);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (offer: Offer) => {
    setEditing(offer);
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error(t("adminPromocoes.missingFieldsError"));
      return;
    }
    const input = {
      type,
      title: title.trim(),
      description: description.trim(),
      ...(code.trim() ? { code: code.trim() } : {}),
    };
    if (editing) {
      updateOffer(editing.id, input);
      toast.success(t("adminPromocoes.updatedToast"));
    } else {
      createOffer(restaurant.id, input);
      toast.success(t("adminPromocoes.createdToast"));
      promoHint.dismiss();
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteOffer(deleting.id);
    toast.success(t("adminPromocoes.deletedToast"));
    setDeleting(null);
  };

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminPromocoes.eyebrow")}
        title={t("adminPromocoes.title")}
        description={t("adminPromocoes.description")}
        action={
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="h-4 w-4" /> {t("adminPromocoes.newPromo")}
          </Button>
        }
      />

      <div className="mx-auto mt-8 max-w-4xl space-y-3 px-4 md:px-6">
        {offers.length === 0 && (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <p className="text-sm text-muted-foreground">{t("adminPromocoes.emptyText")}</p>
            <Button onClick={openCreate} className="rounded-xl">
              <Plus className="h-4 w-4" /> {t("adminPromocoes.createFirst")}
            </Button>
          </div>
        )}

        {offers.map((offer) => {
          const OfferIcon = iconByType[offer.type];
          return (
            <div key={offer.id} className="card-soft flex items-start gap-4 p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <OfferIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  {typeLabels[offer.type]}
                </p>
                <p className="mt-0.5 truncate font-display text-base font-bold text-foreground">
                  {offer.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{offer.description}</p>
                {offer.code && (
                  <p className="mt-2 inline-block rounded-full bg-surface px-3 py-1 text-xs font-bold text-foreground">
                    {t("adminPromocoes.couponCode")}: {offer.code}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={t("adminPromocoes.editAria", { title: offer.title })}
                  onClick={() => openEdit(offer)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("adminPromocoes.removeAria", { title: offer.title })}
                  onClick={() => setDeleting(offer)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="font-display text-lg font-bold">
            {editing ? t("adminPromocoes.editDialogTitle") : t("adminPromocoes.newDialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("adminPromocoes.dialogDescription")}</DialogDescription>

          {!editing && promoHint.shouldShow && (
            <FirstUseHint text={t("adminPromocoes.firstUseHint")} onDismiss={promoHint.dismiss} />
          )}

          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="offer-type">{t("adminPromocoes.typeLabel")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as Offer["type"])}>
                <SelectTrigger id="offer-type" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">{t("adminPromocoes.typeDiscount")}</SelectItem>
                  <SelectItem value="delivery">{t("adminPromocoes.typeDelivery")}</SelectItem>
                  <SelectItem value="happy-hour">{t("adminPromocoes.typeHappyHour")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offer-title">{t("adminPromocoes.titleLabel")}</Label>
              <Input
                id="offer-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("adminPromocoes.titlePlaceholder")}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offer-description">{t("adminPromocoes.descriptionLabel")}</Label>
              <Textarea
                id="offer-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("adminPromocoes.descriptionPlaceholder")}
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offer-code">{t("adminPromocoes.codeLabel")}</Label>
              <Input
                id="offer-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t("adminPromocoes.codePlaceholder")}
              />
            </div>

            <Button type="submit" className="w-full rounded-xl">
              {editing ? t("adminPromocoes.saveChanges") : t("adminPromocoes.createPromo")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("adminPromocoes.deleteDialogTitle", { title: deleting?.title ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminPromocoes.deleteDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("adminPromocoes.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
