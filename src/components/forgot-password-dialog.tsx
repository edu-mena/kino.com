import { Mail, MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/i18n";
import { apiFetch, ApiError } from "@/lib/api-client";

/**
 * "Esqueci a senha" — partilhado entre `/admin/entrar` (restaurant_staff) e
 * `/sistema/entrar` (system_operator), os dois únicos roles com senha (ver
 * backend AuthController::forgotPassword). O backend devolve sempre a MESMA
 * resposta de sucesso, exista ou não o email (evita enumeração de contas) —
 * por isso o único "erro" real de mostrar aqui é validação/rede, nunca
 * "esse email não existe".
 */
export function ForgotPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      // Reseta para a próxima vez que abrir — sem isto reabriria já na tela
      // de "email enviado" se o utilizador tivesse pedido antes.
      setEmail("");
      setSent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/forgot-password", { method: "POST", body: { email } });
      setSent(true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("forgotPassword.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm rounded-[2rem] border-none bg-card p-8">
        {sent ? (
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-7 w-7" />
            </span>
            <DialogTitle className="mt-4 font-display text-lg font-bold text-primary">
              {t("forgotPassword.sentTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t("forgotPassword.sentDescription", { email })}
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-bold text-primary">
                {t("forgotPassword.title")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t("forgotPassword.description")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-2 space-y-3">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("forgotPassword.emailPlaceholder")}
                  className="w-full rounded-xl border border-border bg-background py-3.5 pl-11 pr-4 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? t("forgotPassword.submitting") : t("forgotPassword.submit")}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
