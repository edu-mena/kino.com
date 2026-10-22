import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
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
import { ApiError, apiFetch, hasRealBackend } from "@/lib/api-client";
import { getAdminToken, useRestaurantAdmin } from "@/lib/restaurant-admin";

/**
 * "Apagar a minha conta" no painel do restaurante — exigido pela Apple
 * (5.1.1(v)) para quem entra na app com uma conta de restaurante. Mesma
 * confirmação do perfil de cliente (escrever a palavra). No backend
 * (AccountDeletionService): sendo o único dono, o restaurante fica
 * despublicado; com outro dono, a pessoa só sai da equipa.
 *
 * Não aparece quando um operador de sistema está a ver o painel com o
 * próprio token ("emprestado") — apagaria a conta do OPERADOR.
 */
export function AdminAccountDeletion() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useRestaurantAdmin();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const borrowed = (() => {
    try {
      return localStorage.getItem("luku_admin_token_borrowed") === "1";
    } catch {
      return false;
    }
  })();
  if (!hasRealBackend || borrowed) return null;

  const confirmWord = t("perfil.accountData.confirmWord");
  const canDelete = confirmText.trim().toUpperCase() === confirmWord.toUpperCase();

  const handleDelete = async () => {
    const token = getAdminToken();
    if (!token) return;
    setDeleting(true);
    try {
      await apiFetch("/me", { method: "DELETE", token, body: { confirm: true } });
      setOpen(false);
      toast.success(t("perfil.accountData.deleted"));
      await logout().catch(() => {});
      navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("perfil.accountData.deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setConfirmText("");
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="mx-auto flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("adminPerfil.deleteAccount")}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
        <DialogTitle className="font-display text-lg font-bold">
          {t("perfil.accountData.deleteTitle")}
        </DialogTitle>
        <DialogDescription>{t("adminPerfil.deleteAccountWarning")}</DialogDescription>
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
  );
}
