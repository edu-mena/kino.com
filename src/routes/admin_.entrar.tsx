import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { ForgotPasswordDialog } from "@/components/forgot-password-dialog";
import { Logo } from "@/components/logo";
import { useTranslation } from "@/i18n";
import { ApiError } from "@/lib/api-client";
import { OperatorProviders } from "@/lib/operator-providers";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin_/entrar")({
  head: () => ({
    meta: [
      { title: "Painel do restaurante — Luku.com" },
      { name: "description", content: "Aceda ao painel para gerir pedidos, reservas e cardápio." },
      { property: "og:title", content: "Painel do restaurante — Luku.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: () => (
    <OperatorProviders>
      <AdminEntrar />
    </OperatorProviders>
  ),
});

function AdminEntrar() {
  const { login } = useRestaurantAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t("adminEntrar.successToast"));
      navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("adminEntrar.errorToast"));
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
          <ArrowLeft className="h-4 w-4" /> {t("adminEntrar.backHome")}
        </Link>

        <div className="mt-6">
          <Logo />
        </div>

        <h1 className="mt-6 text-3xl font-extrabold text-primary">{t("adminEntrar.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("adminEntrar.description")}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("adminEntrar.emailPlaceholder")}
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
              placeholder={t("adminEntrar.passwordPlaceholder")}
              className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t("adminEntrar.submitting") : t("adminEntrar.submit")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setForgotOpen(true)}
          className="mt-4 block w-full text-center text-sm font-semibold text-primary hover:underline"
        >
          {t("adminEntrar.forgotPassword")}
        </button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("adminEntrar.notPartnerYet")}{" "}
          <Link to="/parceiros" className="font-bold text-primary">
            {t("adminEntrar.becomePartner")}
          </Link>
        </p>
      </div>
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}
