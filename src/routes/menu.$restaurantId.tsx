import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Printer } from "lucide-react";
import { useMemo } from "react";
import icon from "@/assets/icon.png";
import logo from "@/assets/logo.png";
import { MenuDocument } from "@/components/menu-document";
import { defaultMenuId } from "@/data/menus-store";
import {
  useRestaurantDetail,
  useRestaurantMenuItems,
  useRestaurantMenus,
} from "@/data/use-restaurants-query";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/menu/$restaurantId")({
  head: () => ({
    meta: [
      { title: "Cardápio — Luku.com" },
      { name: "description", content: "Veja o cardápio do restaurante no Luku.com." },
      { property: "og:image", content: icon },
    ],
  }),
  component: PublicMenu,
});

function PublicMenu() {
  const { restaurantId } = Route.useParams();
  const { t, locale } = useTranslation();

  // Ligado à API real quando disponível (`useRestaurantDetail`/
  // `useRestaurantMenus`/`useRestaurantMenuItems`, ver @/data/use-restaurants-query)
  // — antes lia só `getRestaurant`/`getMenusByRestaurant` locais (mock), por
  // isso o QR code de um restaurante real caía sempre em "não encontrado".
  const { data: restaurant, isLoading: restaurantLoading } = useRestaurantDetail(restaurantId);
  const { data: menusData } = useRestaurantMenus(restaurantId);
  const { data: itemsData } = useRestaurantMenuItems(restaurantId);

  const menus = useMemo(() => (menusData ?? []).filter((m) => m.isActive), [menusData]);
  const items = useMemo(() => (itemsData ?? []).filter((d) => d.isAvailable), [itemsData]);
  const dishesFor = (menuId: string) =>
    items.filter((d) => (d.menuId ?? defaultMenuId(restaurantId)) === menuId);

  const today = new Date().toLocaleDateString(
    locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "pt-PT",
    { day: "2-digit", month: "long", year: "numeric" },
  );

  // Espera a resposta da API antes de decidir "não encontrado" — sem isto,
  // um restaurante real (que só resolve depois do fetch) mostrava sempre
  // esta mensagem por um instante, e em conexões lentas até substituía o
  // cardápio real por engano.
  if (restaurantLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <img src={logo} alt="Luku.com" className="h-9 w-auto" />
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <img src={logo} alt="Luku.com" className="h-9 w-auto" />
        <p className="text-sm text-muted-foreground">{t("publicMenu.notFound")}</p>
        <Link to="/restaurantes" className="font-bold text-primary underline">
          {t("nav.restaurants")}
        </Link>
      </div>
    );
  }

  // Sem porta de entrada — ver o cardápio pelo QR code não exige conta Luku
  // (só pediria login mais à frente, se o cliente tentar algo que precise de
  // conta, ex: pedir/favoritar; nada nesta página exige isso). Antes disto
  // era exigido login com Google logo ao abrir, o que matava a experiência
  // de quem só queria ver o cardápio estando já no restaurante.
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
