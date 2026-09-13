import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Lock, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { Logo } from "@/components/logo";
import { useTranslation } from "@/i18n";
import { ApiError } from "@/lib/api-client";
import { OperatorProviders } from "@/lib/operator-providers";
import { useSystemAdmin } from "@/lib/system-admin";

export const Route = createFileRoute("/sistema_/entrar")({
  head: () => ({
    meta: [
      { title: "Administração de sistema — Luku.com" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Administração de sistema — Luku.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: () => (
    <OperatorProviders>
      <SistemaEntrar />
    </OperatorProviders>
  ),
});

function SistemaEntrar() {
  const { login } = useSystemAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t("sistema.entrar.successToast"));
      navigate({ to: "/sistema" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("sistema.entrar.errorToast"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12 sm:px-12">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> {t("sistema.entrar.backHome")}
        </Link>

        <div className="mt-6">
          <Logo />
        </div>

        <div className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("sistema.shellBadge")}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold text-primary">{t("sistema.entrar.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("sistema.entrar.description")}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("sistema.entrar.emailPlaceholder")}
              className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("sistema.entrar.passwordPlaceholder")}
              className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t("sistema.entrar.submitting") : t("sistema.entrar.submit")}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {t("sistema.entrar.notice")}
        </p>
      </div>
    </div>
  );
}
