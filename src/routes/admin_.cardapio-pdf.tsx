import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { MenuDocument } from "@/components/menu-document";
import { defaultMenuId } from "@/data/menus-store";
import type { MenuItem, RestaurantMenu } from "@/data/types";
import { useTranslation } from "@/i18n";
import { useMenuAdmin } from "@/lib/menu-admin";
import { useMenusAdmin } from "@/lib/menus-admin";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin_/cardapio-pdf")({
  head: () => ({ meta: [{ title: "Cardápio — Kino.com" }] }),
  validateSearch: (s: Record<string, unknown>): { menu: string } => {
    const raw = s["menu"];
    return { menu: typeof raw === "string" && raw ? raw : "all" };
  },
  component: CardapioPdf,
});

function CardapioPdf() {
  const { menu: menuParam } = Route.useSearch();
  const { restaurant, hydrated } = useRestaurantAdmin();
  const { menusByRestaurant } = useMenusAdmin();
  const { items } = useMenuAdmin();
  const { t, locale } = useTranslation();
  const printed = useRef(false);

  const menus = useMemo<RestaurantMenu[]>(
    () => (restaurant ? menusByRestaurant(restaurant.id) : []),
    [restaurant, menusByRestaurant],
  );

  const menusToPrint = useMemo(
    () => (menuParam === "all" ? menus : menus.filter((m) => m.id === menuParam)),
    [menus, menuParam],
  );

  const dishesByMenu = useMemo(() => {
    if (!restaurant) return new Map<string, MenuItem[]>();
    const map = new Map<string, MenuItem[]>();
    for (const m of menusToPrint) {
      map.set(
        m.id,
        items
          .filter(
            (i) =>
              i.restaurantId === restaurant.id &&
              (i.menuId ?? defaultMenuId(restaurant.id)) === m.id,
          )
          .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
      );
    }
    return map;
  }, [restaurant, menusToPrint, items]);

  const totalDishes = useMemo(
    () => [...dishesByMenu.values()].reduce((n, list) => n + list.length, 0),
    [dishesByMenu],
  );

  // Abre a caixa de impressão assim que o documento estiver pronto (o
  // utilizador escolhe "Guardar como PDF"). Só uma vez.
  useEffect(() => {
    if (printed.current || !restaurant || totalDishes === 0) return;
    printed.current = true;
    const id = setTimeout(() => window.print(), 500);
    return () => clearTimeout(id);
  }, [restaurant, totalDishes]);

  if (!hydrated) return null;

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-md p-10 text-center text-sm text-muted-foreground">
        {t("cardapioPdf.noSession")}{" "}
        <Link to="/admin/entrar" className="font-bold text-primary underline">
          /admin/entrar
        </Link>
      </div>
    );
  }

  const today = new Date().toLocaleDateString(
    locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "pt-PT",
    { day: "2-digit", month: "long", year: "numeric" },
  );

  const isAll = menuParam === "all";

  return (
    <div className="min-h-screen bg-neutral-100 py-8 print:bg-white print:py-0">
      <style>{`
        @page { size: A4; margin: 16mm; }
        @media print {
          .pdf-toolbar { display: none !important; }
          .md-menu + .md-menu { break-before: page; }
          .md-dish { break-inside: avoid; }
          .md-cat { break-after: avoid; }
          html, body { background: #fff !important; }
        }
      `}</style>

      {/* Barra de ações — escondida na impressão */}
      <div className="pdf-toolbar mx-auto mb-6 flex max-w-[210mm] items-center justify-between gap-3 px-4">
        <Link
          to="/admin/cardapio"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
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
        menus={menusToPrint}
        dishesFor={(id) => dishesByMenu.get(id) ?? []}
        title={isAll ? t("cardapioPdf.allMenusTitle") : t("cardapioPdf.documentTitle")}
        subtitle={t("cardapioPdf.generatedOn", { date: today })}
      />
    </div>
  );
}
