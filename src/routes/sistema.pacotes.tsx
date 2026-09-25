import { createFileRoute } from "@tanstack/react-router";
import { Pencil, PartyPopper, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SystemPageHeading } from "@/components/system-shell";
import type { PackageType } from "@/data/types";
import { useTranslation } from "@/i18n";
import { packageTypeIcon } from "@/lib/package-type-icons";
import { usePackageTypesAdmin } from "@/lib/package-types";

export const Route = createFileRoute("/sistema/pacotes")({
  head: () => ({ meta: [{ title: "Pacotes — Sistema Luku.com" }] }),
  component: SistemaPacotes,
});

type Draft = {
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
};
const emptyDraft: Draft = { name: "", description: "", icon: "", isActive: true };

function SistemaPacotes() {
  const { packageTypes, createPackageType, updatePackageType, deletePackageType } =
    usePackageTypesAdmin();
  const { t } = useTranslation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PackageType | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<PackageType | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setDialogOpen(true);
  };
  const openEdit = (type: PackageType) => {
    setEditing(type);
    setDraft({
      name: type.name,
      description: type.description ?? "",
      icon: type.icon ?? "",
      isActive: type.isActive,
    });
    setDialogOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      toast.error(t("sistema.pacotes.nameRequiredError"));
      return;
    }
    const input = {
      name: draft.name.trim(),
      ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
      ...(draft.icon.trim() ? { icon: draft.icon.trim() } : {}),
      isActive: draft.isActive,
      position: editing?.position ?? packageTypes.length,
    };
    setSaving(true);
    const ok = editing
      ? await updatePackageType(editing.id, input)
      : await createPackageType(input);
    setSaving(false);
    if (!ok) {
      toast.error(t("sistema.pacotes.saveFailedError"));
      return;
    }
    toast.success(editing ? t("sistema.pacotes.updatedToast") : t("sistema.pacotes.createdToast"));
    setDialogOpen(false);
  };

  return (
    <div className="pb-16">
      <SystemPageHeading
        eyebrow={t("sistema.pacotes.eyebrow")}
        title={t("sistema.pacotes.title")}
        description={t("sistema.pacotes.description")}
        action={
          <Button type="button" onClick={openCreate} className="rounded-xl">
            <Plus className="h-4 w-4" /> {t("sistema.pacotes.new")}
          </Button>
        }
      />

      <div className="mx-auto mt-8 max-w-4xl px-4 md:px-6">
        {packageTypes.length === 0 ? (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <PartyPopper className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("sistema.pacotes.empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {packageTypes.map((type) => {
              const Icon = packageTypeIcon(type.icon);
              return (
                <div key={type.id} className="card-soft flex items-start gap-4 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-bold text-foreground">{type.name}</p>
                      {!type.isActive && (
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {t("sistema.pacotes.inactiveBadge")}
                        </span>
                      )}
                    </div>
                    {type.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{type.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label={t("sistema.pacotes.edit")}
                      onClick={() => openEdit(type)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("sistema.pacotes.delete")}
                      onClick={() => setToDelete(type)}
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
              {editing ? t("sistema.pacotes.editTitle") : t("sistema.pacotes.newTitle")}
            </DialogTitle>
            <DialogDescription>{t("sistema.pacotes.dialogHint")}</DialogDescription>
          </div>
          <form
            id="package-type-form"
            onSubmit={submit}
            className="mt-3 space-y-3 overflow-y-auto px-6 pb-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="package-type-name">{t("sistema.pacotes.nameLabel")}</Label>
              <Input
                id="package-type-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder={t("sistema.pacotes.namePlaceholder")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="package-type-desc">{t("sistema.pacotes.descLabel")}</Label>
              <Textarea
                id="package-type-desc"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                rows={2}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="package-type-icon">{t("sistema.pacotes.iconLabel")}</Label>
              <Input
                id="package-type-icon"
                value={draft.icon}
                onChange={(e) => setDraft((d) => ({ ...d, icon: e.target.value }))}
                placeholder="cake"
              />
              <p className="text-xs text-muted-foreground">{t("sistema.pacotes.iconHint")}</p>
            </div>
            {editing && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div>
                  <Label htmlFor="package-type-active">{t("sistema.pacotes.activeLabel")}</Label>
                  <p className="text-xs text-muted-foreground">{t("sistema.pacotes.activeHint")}</p>
                </div>
                <Switch
                  id="package-type-active"
                  checked={draft.isActive}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, isActive: v }))}
                />
              </div>
            )}
          </form>
          <div className="border-t border-border px-6 py-4">
            <Button
              type="submit"
              form="package-type-form"
              className="w-full rounded-xl"
              disabled={saving}
            >
              {editing ? t("sistema.pacotes.save") : t("sistema.pacotes.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sistema.pacotes.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("sistema.pacotes.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (toDelete) {
                  const ok = await deletePackageType(toDelete.id);
                  if (!ok) {
                    toast.error(t("sistema.pacotes.deleteFailedError"));
                    return;
                  }
                  toast.success(t("sistema.pacotes.deletedToast"));
                }
                setToDelete(null);
              }}
            >
              {t("sistema.pacotes.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
