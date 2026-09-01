import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Printer } from "lucide-react";
import { useMemo, useState, type SVGProps } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import logo from "@/assets/logo.png";
import { MenuDocument } from "@/components/menu-document";
import { getMenuItemsByRestaurant, getRestaurant } from "@/data/helpers";
import { defaultMenuId, getMenusByRestaurant } from "@/data/menus-store";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/menu/$restaurantId")({
  head: () => ({
    meta: [
      { title: "Cardápio — Kino.com" },
      { name: "description", content: "Veja o cardápio do restaurante no Kino.com." },
      { property: "og:image", content: icon },
    ],
  }),
  component: PublicMenu,
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

function PublicMenu() {
  const { restaurantId } = Route.useParams();
  const { t, locale } = useTranslation();
  const { isLoggedIn, isLoading, login } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  const restaurant = getRestaurant(restaurantId);

  const menus = useMemo(
    () => getMenusByRestaurant(restaurantId).filter((m) => m.isActive),
    [restaurantId],
  );
  const items = useMemo(
    () => getMenuItemsByRestaurant(restaurantId).filter((d) => d.isAvailable),
    [restaurantId],
  );
  const dishesFor = (menuId: string) =>
    items.filter((d) => (d.menuId ?? defaultMenuId(restaurantId)) === menuId);

  const today = new Date().toLocaleDateString(
    locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "pt-PT",
    { day: "2-digit", month: "long", year: "numeric" },
  );

  const handleGoogle = () => {
    setSigningIn(true);
    // Simulação: numa integração real abriria o fluxo OAuth do Google.
    setTimeout(() => {
      login("Utilizador Kino", "utilizador@gmail.com");
      toast.success(t("publicMenu.signedInToast"));
    }, 700);
  };

  if (!restaurant) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <img src={logo} alt="Kino.com" className="h-9 w-auto" />
        <p className="text-sm text-muted-foreground">{t("publicMenu.notFound")}</p>
        <Link to="/restaurantes" className="font-bold text-primary underline">
          {t("nav.restaurants")}
        </Link>
      </div>
    );
  }

  if (isLoading) return null;

  // Porta de entrada — para ver o cardápio é preciso conta Kino (simulada).
  if (!isLoggedIn) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-6 text-center">
        <img src={logo} alt="Kino.com" className="h-10 w-auto" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            {t("publicMenu.eyebrow")}
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-primary">
            {restaurant.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("publicMenu.gateText")}</p>
        </div>
        <button
          type="button"
          onClick={handleGoogle}
          disabled={signingIn}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition-colors hover:border-primary disabled:opacity-60"
        >
          <GoogleIcon className="h-5 w-5" />
          {signingIn ? t("publicMenu.signingIn") : t("publicMenu.continueWithGoogle")}
        </button>
        <p className="text-xs text-muted-foreground">{t("publicMenu.gateHint")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 py-8 print:bg-white print:py-0">
      <style>{`
        @page { size: A4; margin: 16mm; }
        @media print {
          .pm-toolbar { display: none !important; }
          .md-menu + .md-menu { break-before: page; }
          .md-dish { break-inside: avoid; }
          .md-cat { break-after: avoid; }
          html, body { background: #fff !important; }
        }
      `}</style>

      {/* Barra de ações — escondida na impressão */}
      <div className="pm-toolbar mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link
          to="/restaurantes/$id"
          params={{ id: restaurantId }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition-colors hover:border-primary"
        >
          <ExternalLink className="h-4 w-4" /> {t("publicMenu.visitRestaurant")}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          <Printer className="h-4 w-4" /> {t("cardapioPdf.print")}
        </button>
      </div>

      <MenuDocument
        restaurant={restaurant}
        menus={menus}
        dishesFor={dishesFor}
        title={t("cardapioPdf.documentTitle")}
        subtitle={t("cardapioPdf.generatedOn", { date: today })}
      />

      {/* CTA cliente — repetido no fim, escondido na impressão */}
      <div className="pm-toolbar mx-auto mt-6 max-w-[210mm] px-4">
        <Link
          to="/restaurantes/$id"
          params={{ id: restaurantId }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          <ExternalLink className="h-4 w-4" /> {t("publicMenu.visitRestaurant")}
        </Link>
      </div>
    </div>
  );
}
