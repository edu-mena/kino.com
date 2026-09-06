import { createFileRoute } from "@tanstack/react-router";
import icon from "@/assets/icon.png";
import { MenuBrowser } from "@/components/menu-browser";
import { PageHeading, PageShell } from "@/components/site-shell";
import { getRestaurant } from "@/data/helpers";
import { useTranslation } from "@/i18n";

type CardapioSearch = { categoria?: string | undefined; restaurante?: string | undefined };

export const Route = createFileRoute("/cardapio")({
  validateSearch: (search: Record<string, unknown>): CardapioSearch => ({
    categoria: typeof search["categoria"] === "string" ? search["categoria"] : undefined,
    restaurante: typeof search["restaurante"] === "string" ? search["restaurante"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Cardápio completo — Kino.com" },
      {
        name: "description",
        content:
          "Explore o cardápio do Kino.com: burgers, pizza, pratos angolanos, bebidas e sobremesas com entrega em Luanda.",
      },
      { property: "og:title", content: "Cardápio completo — Kino.com" },
      { property: "og:description", content: "Burgers, pizza, pratos, bebidas e sobremesas." },
      { property: "og:image", content: icon },
    ],
  }),
  component: Cardapio,
});

function Cardapio() {
  const { restaurante } = Route.useSearch();
  const restaurantFilter = restaurante ? getRestaurant(restaurante) : undefined;
  const { t } = useTranslation();

  return (
    <PageShell>
      {/* Sem restaurante escolhido a página é só a busca — o cabeçalho genérico
          ("Cardápio / Escolha o seu próximo prato / …") só ocupava espaço. */}
      {restaurantFilter && (
        <PageHeading
          eyebrow={t("cardapio.eyebrow")}
          title={restaurantFilter.name}
          description={`${t("cardapio.eyebrow")} ${restaurantFilter.name} — ${restaurantFilter.cuisine}.`}
        />
      )}

      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
        <MenuBrowser
          restaurantFilter={
            restaurantFilter ? { id: restaurantFilter.id, name: restaurantFilter.name } : undefined
          }
        />
      </div>
    </PageShell>
  );
}
