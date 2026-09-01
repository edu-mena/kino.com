import logo from "@/assets/logo.png";
import type { MenuItem, Restaurant, RestaurantMenu } from "@/data/types";
import { translateMenuCategory, useTranslation } from "@/i18n";
import { formatKz } from "@/lib/format";

/**
 * Folha imprimível do cardápio — reaproveitada pela exportação PDF do painel
 * (`/admin/cardapio-pdf`) e pelo cardápio público que abre ao ler o QR code
 * (`/menu/$restaurantId`). Só o "miolo": logo Kino, dados do restaurante,
 * cardápios por secção. Cada rota traz a sua própria barra de ações e o
 * `<style>` de impressão (que aponta para as classes `md-*` daqui).
 */
export function MenuDocument({
  restaurant,
  menus,
  dishesFor,
  title,
  subtitle,
}: {
  restaurant: Restaurant;
  menus: RestaurantMenu[];
  dishesFor: (menuId: string) => MenuItem[];
  /** Linha 1 do canto superior direito (ex: "Cardápio"). */
  title: string;
  /** Linha 2 (ex: "Gerado em 3 de setembro de 2026"). */
  subtitle: string;
}) {
  const { t, locale } = useTranslation();

  return (
    <div className="mx-auto max-w-[210mm] bg-white px-[16mm] py-[14mm] text-black shadow-sm print:max-w-none print:p-0 print:shadow-none">
      {/* Cabeçalho Kino */}
      <div className="flex items-end justify-between gap-4 border-b-2 border-primary pb-4">
        <img src={logo} alt="Kino.com" className="h-9 w-auto" />
        <p className="text-right text-[11px] leading-tight text-neutral-500">
          {title}
          <br />
          {subtitle}
        </p>
      </div>

      {/* Dados do restaurante */}
      <div className="mt-5">
        <h1 className="font-display text-2xl font-extrabold text-primary">{restaurant.name}</h1>
        <p className="mt-0.5 text-sm text-neutral-600">{restaurant.cuisine}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-neutral-700">
          <div>
            <dt className="inline font-semibold">{t("cardapioPdf.address")}: </dt>
            <dd className="inline">
              {restaurant.address}, {restaurant.neighborhood}
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold">{t("cardapioPdf.hours")}: </dt>
            <dd className="inline">{restaurant.openingHours}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{t("cardapioPdf.phone")}: </dt>
            <dd className="inline">{restaurant.phone}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{t("cardapioPdf.email")}: </dt>
            <dd className="inline">{restaurant.email}</dd>
          </div>
        </dl>
      </div>

      {/* Cardápios */}
      {menus.map((m) => {
        const dishes = dishesFor(m.id);
        const cats = [...new Set(dishes.map((d) => d.category))];
        return (
          <section key={m.id} className="md-menu mt-8">
            <div className="flex items-baseline gap-2 border-b border-neutral-300 pb-1.5">
              <h2 className="font-display text-lg font-bold text-neutral-900">{m.name}</h2>
              {m.category && m.category !== "personalizado" && (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-brand">
                  {t(`menuTypes.${m.category}`)}
                </span>
              )}
              {!m.isActive && (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  {t("cardapioPdf.draft")}
                </span>
              )}
            </div>

            {dishes.length === 0 && (
              <p className="mt-2 text-xs italic text-neutral-400">{t("cardapioPdf.emptyMenu")}</p>
            )}

            {cats.map((cat) => (
              <div key={cat} className="mt-4">
                <h3 className="md-cat text-[13px] font-bold uppercase tracking-wider text-primary">
                  {translateMenuCategory(cat, locale)}
                </h3>
                <div className="mt-1.5 divide-y divide-dashed divide-neutral-200">
                  {dishes
                    .filter((d) => d.category === cat)
                    .map((d) => {
                      const extras = d.ingredients.filter((i) => i.extraPrice);
                      return (
                        <div key={d.id} className="md-dish py-2">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-neutral-900">
                              {d.name}
                              {!d.isAvailable && (
                                <span className="ml-1.5 text-[10px] font-medium uppercase text-neutral-400">
                                  ({t("cardapioPdf.unavailable")})
                                </span>
                              )}
                            </span>
                            <span className="mx-1 flex-1 translate-y-[-3px] border-b border-dotted border-neutral-300" />
                            <span className="shrink-0 font-bold text-neutral-900">
                              {formatKz(d.price)}
                            </span>
                          </div>
                          {d.description && (
                            <p className="mt-0.5 text-[12px] leading-snug text-neutral-600">
                              {d.description}
                            </p>
                          )}
                          <p className="mt-0.5 text-[11px] text-neutral-500">
                            {d.portionInfo}
                            {extras.length > 0 && (
                              <>
                                {" · "}
                                {t("cardapioPdf.extrasLabel")}:{" "}
                                {extras
                                  .map((e) => `${e.name} (+${formatKz(e.extraPrice ?? 0)})`)
                                  .join(", ")}
                              </>
                            )}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {/* Rodapé */}
      <div className="mt-10 border-t border-neutral-300 pt-3 text-center text-[10px] text-neutral-400">
        {t("cardapioPdf.poweredBy")} · kino.com
      </div>
    </div>
  );
}
