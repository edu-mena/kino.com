import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Store, Zap, Users } from "lucide-react";
import icon from "@/assets/icon.png";
import { Logo } from "@/components/logo";

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

const options = [
  {
    icon: Users,
    title: "Sou cliente",
    advantage: "Peça em poucos toques, sem palavra-passe para memorizar.",
    to: "/entrar" as const,
    cta: "Continuar com Google",
  },
  {
    icon: Store,
    title: "Tenho um restaurante",
    advantage: "Cardápio digital, QR Code e gestão de mesas prontos em minutos.",
    to: "/parceiros" as const,
    cta: "Cadastrar restaurante",
  },
];

function Cadastro() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-5 py-12 sm:px-12">
      <div className="w-full max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>

        <div className="mx-auto mt-8 flex max-w-md flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-3xl font-extrabold text-primary">Como quer usar a Kino?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha o tipo de conta que quer criar — é rápido e pode mudar depois.
          </p>
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
