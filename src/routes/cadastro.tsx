import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Store, Zap, Users } from "lucide-react";
import icon from "@/assets/icon.png";
import { Logo } from "@/components/logo";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta — Kino.com" },
      {
        name: "description",
        content: "Escolha como quer usar a Kino: como cliente ou como restaurante parceiro.",
      },
      { property: "og:title", content: "Criar conta — Kino.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Cadastro,
});

function Cadastro() {
  const { t } = useTranslation();

  const options = [
    {
      icon: Users,
      title: t("cadastro.customerTitle"),
      advantage: t("cadastro.customerAdvantage"),
      to: "/entrar" as const,
      cta: t("cadastro.customerCta"),
    },
    {
      icon: Store,
      title: t("cadastro.restaurantTitle"),
      advantage: t("cadastro.restaurantAdvantage"),
      to: "/parceiros" as const,
      cta: t("cadastro.restaurantCta"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-5 py-12 sm:px-12">
      <div className="w-full max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> {t("cadastro.backHome")}
        </Link>

        <div className="mx-auto mt-8 flex max-w-md flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-3xl font-extrabold text-primary">{t("cadastro.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("cadastro.description")}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {options.map((option) => (
            <div
              key={option.title}
              className="flex flex-col rounded-[2rem] border border-border bg-card p-6 sm:p-8"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border border-border bg-background text-brand">
                <option.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-display text-lg font-bold text-primary">{option.title}</h2>
              <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                {option.advantage}
              </p>
              <Link
                to={option.to}
                className="mt-6 inline-flex items-center justify-center gap-1 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {option.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
