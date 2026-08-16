import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, type SVGProps } from "react";
import { toast } from "sonner";
import authFood from "@/assets/auth-food.jpg";
import icon from "@/assets/icon.png";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar na sua conta — Kino.com" },
      {
        name: "description",
        content: "Inicie sessão no Kino.com com a sua conta Google para continuar a pedir comida.",
      },
      { property: "og:title", content: "Entrar na sua conta — Kino.com" },
      { property: "og:description", content: "Sessão simples e segura com a sua conta Google." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Entrar,
});

function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.28A12 12 0 0 0 0 12c0 1.94.47 3.77 1.28 5.39l3.99-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.61l3.99 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function Entrar() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleAuth = () => {
    setLoading(true);
    // Simulação: numa integração real isto abriria o fluxo OAuth do Google.
    setTimeout(() => {
      login("Utilizador Kino", "utilizador@gmail.com");
      toast.success("Sessão iniciada com a Google!");
      navigate({ to: "/" });
    }, 900);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img
          src={authFood}
          alt="Hambúrguer artesanal com ingredientes frescos"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/55" />
        <div className="relative flex h-full flex-col justify-end p-12 text-primary-foreground">
          <h2 className="max-w-sm font-display text-4xl font-extrabold leading-tight">
            Comer bem, ficou fácil.
          </h2>
          <p className="mt-3 max-w-sm text-sm opacity-90">
            Entre com a sua conta Google e peça dos melhores restaurantes de Luanda em poucos
            toques.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center px-5 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao início
          </Link>

          <div className="mt-6">
            <Logo />
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-primary">Bem-vindo à Kino</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre ou crie a sua conta com um único toque — sem palavras-passe para memorizar.
          </p>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-primary disabled:opacity-60"
          >
            <GoogleIcon className="h-5 w-5" />
            {loading ? "A entrar..." : "Continuar com Google"}
          </button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ao continuar, concorda com os nossos Termos e a Política de Privacidade.
          </p>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="font-bold text-primary">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
