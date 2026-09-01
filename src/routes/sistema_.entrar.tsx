import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import { Logo } from "@/components/logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n";
import { OPERATORS, useSystemAdmin } from "@/lib/system-admin";

export const Route = createFileRoute("/sistema_/entrar")({
  head: () => ({
    meta: [
      { title: "Administração de sistema — Kino.com" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Administração de sistema — Kino.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: SistemaEntrar,
});

function SistemaEntrar() {
  const { login } = useSystemAdmin();
  const navigate = useNavigate();
  const [operatorId, setOperatorId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId) return;
    setLoading(true);
    setTimeout(() => {
      login(operatorId);
      const operator = OPERATORS.find((o) => o.id === operatorId);
      toast.success(t("sistema.entrar.successToast", { name: operator?.name ?? "" }));
      navigate({ to: "/sistema" });
    }, 400);
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

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Select value={operatorId ?? ""} onValueChange={setOperatorId}>
            <SelectTrigger className="h-auto rounded-xl border-border bg-card px-4 py-3.5 text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder={t("sistema.entrar.placeholder")} />
              </div>
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="submit"
            disabled={!operatorId || loading}
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
