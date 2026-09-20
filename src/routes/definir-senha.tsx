import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Lock, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { Logo } from "@/components/logo";
import { useTranslation } from "@/i18n";
import { apiFetch, ApiError } from "@/lib/api-client";

/**
 * Destino do link enviado por `Password::sendResetLink()` (ver
 * backend/app/Providers/AppServiceProvider.php, `ResetPassword::createUrlUsing`)
 * — só staff/operador têm senha (clientes entram por Google), por isso não
 * sabe à partida qual painel, mostra os dois no fim.
 */
export const Route = createFileRoute("/definir-senha")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s["token"] === "string" ? s["token"] : "",
    email: typeof s["email"] === "string" ? s["email"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Definir nova senha — Luku.com" },
      { name: "robots", content: "noindex" },
      { property: "og:image", content: icon },
    ],
  }),
  component: DefinirSenha,
});

function DefinirSenha() {
  const { token, email } = Route.useSearch();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmation) {
      toast.error(t("definirSenha.mismatchError"));
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/reset-password", {
        method: "POST",
        body: { email, token, password, password_confirmation: confirmation },
      });
      setDone(true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("definirSenha.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12 sm:px-12">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto w-fit">
          <Logo />
        </div>

        {!token || !email ? (
          <div className="mt-8">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-xl font-bold text-primary">
              {t("definirSenha.invalidTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("definirSenha.invalidDescription")}
            </p>
          </div>
        ) : done ? (
          <div className="mt-8">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-xl font-bold text-primary">{t("definirSenha.doneTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("definirSenha.doneDescription")}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                to="/admin/entrar"
                className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary"
              >
                {t("definirSenha.goToAdmin")}
              </Link>
              <Link
                to="/sistema/entrar"
                className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary"
              >
                {t("definirSenha.goToSistema")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-extrabold text-primary">{t("definirSenha.title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("definirSenha.description", { email })}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-3 text-left">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("definirSenha.passwordPlaceholder")}
                  className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder={t("definirSenha.confirmPlaceholder")}
                  className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? t("definirSenha.submitting") : t("definirSenha.submit")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
