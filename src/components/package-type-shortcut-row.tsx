import { Link } from "@tanstack/react-router";
import { HorizontalCarousel } from "@/components/horizontal-carousel";
import { usePackageTypesWithOffers } from "@/data/use-package-types-query";
import { packageTypeIcon } from "@/lib/package-type-icons";

/**
 * Slide horizontal de tipos de pacote (Aniversário, Reunião de Negócios...)
 * na home — atalho pra `/pacotes/$packageTypeId`, mesmo desenho de
 * `CategoryShortcutRow`. Só mostra tipos com pelo menos um restaurante a
 * oferecer (ver `usePackageTypesWithOffers`); `null` enquanto carrega ou
 * sem nenhum tipo disponível — quem usa isto decide se mostra a secção.
 */
export function PackageTypeShortcutRow() {
  const { data: packageTypes = [] } = usePackageTypesWithOffers();

  if (packageTypes.length === 0) return null;

  return (
    <HorizontalCarousel
      items={packageTypes}
      itemKey={(type) => type.id}
      itemClassName="pl-2"
      contentClassName="-ml-2"
      showArrows={false}
      renderItem={(type) => {
        const Icon = packageTypeIcon(type.icon);
        return (
          <Link
            to="/pacotes/$packageTypeId"
            params={{ packageTypeId: type.id }}
            className="card-soft flex w-fit shrink-0 flex-col items-center gap-2 px-5 py-4 text-center transition-colors hover:border-brand"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
              <Icon className="h-5 w-5" />
            </span>
            <p className="whitespace-nowrap text-xs font-semibold text-foreground">{type.name}</p>
          </Link>
        );
      }}
    />
  );
}
