import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";
import { ApiError, hasRealBackend } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";

/**
 * "Os meus dados" no perfil do cliente — descarregar tudo o que a Luku
 * guarda sobre a conta e apagá-la (auditoria de segurança, Fase 3; exigido
 * pela Apple e pelo Google Play, e direito do titular na Lei n.º 22/11).
 * Não existe na demo sem backend (não há conta real para exportar/apagar).
 */
export function AccountDataActions() {
  const { exportData, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!hasRealBackend) return null;

  const confirmWord = t("perfil.accountData.confirmWord");
  const canDelete = confirmText.trim().toUpperCase() === confirmWord.toUpperCase();

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportData();
    } catch {
      toast.error(t("perfil.accountData.exportError"));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setDeleteOpen(false);
      toast.success(t("perfil.accountData.deleted"));
      navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("perfil.accountData.deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  const rowClass =
    "group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-surface disabled:opacity-50";

  return (
    <>
      <button type="button" onClick={handleExport} disabled={exporting} className={rowClass}>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary transition-transform group-hover:scale-110">
          <Download className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {t("perfil.accountData.exportLabel")}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {t("perfil.accountData.exportDescription")}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </button>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <DialogTrigger asChild>
          <button type="button" className={rowClass}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive transition-transform group-hover:scale-110">
              <Trash2 className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {t("perfil.accountData.deleteLabel")}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {t("perfil.accountData.deleteDescription")}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="font-display text-lg font-bold">
            {t("perfil.accountData.deleteTitle")}
          </DialogTitle>
          <DialogDescription>{t("perfil.accountData.deleteWarning")}</DialogDescription>
          <p className="text-sm text-foreground">
            {t("perfil.accountData.confirmPrompt", { word: confirmWord })}
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmWord}
            autoComplete="off"
          />
          <Button
            variant="destructive"
            disabled={!canDelete || deleting}
            onClick={handleDelete}
            className="w-full"
          >
            {deleting ? t("perfil.accountData.deleting") : t("perfil.accountData.deleteConfirm")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
