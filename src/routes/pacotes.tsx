import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, PartyPopper } from "lucide-react";
import icon from "@/assets/icon.png";
import { PageShell } from "@/components/site-shell";
import { usePackageTypesWithOffers } from "@/data/use-package-types-query";
import { useTranslation } from "@/i18n";
import { packageTypeIcon } from "@/lib/package-type-icons";

export const Route = createFileRoute("/pacotes")({
  head: () => ({
    meta: [
      { title: "Pacotes de consumo — Luku.com" },
      {
        name: "description",
        content:
          "Aniversário, reunião de negócios, amigos, feriados — encontre um restaurante que ofereça o pacote certo para a sua ocasião.",
      },
      { property: "og:title", content: "Pacotes de consumo — Luku.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Pacotes,
});

function Pacotes() {
  const { t } = useTranslation();
  const { data: packageTypes = [], isLoading } = usePackageTypesWithOffers();

  return (
    <PageShell>
      <div className="mx-auto mt-6 max-w-3xl px-4 md:px-6">
        <h1 className="font-display text-2xl font-extrabold text-primary sm:text-3xl">
          {t("pacotes.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("pacotes.description")}</p>

        {isLoading ? (
          <p className="card-soft mt-6 p-10 text-center text-sm text-muted-foreground">
            {t("common.loading")}
          </p>
        ) : packageTypes.length === 0 ? (
          <div className="card-soft mt-6 grid place-items-center gap-3 p-12 text-center">
            <PartyPopper className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("pacotes.empty")}</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {packageTypes.map((type) => {
              const Icon = packageTypeIcon(type.icon);
              return (
                <Link
                  key={type.id}
                  to="/pacotes/$packageTypeId"
                  params={{ packageTypeId: type.id }}
                  className="card-soft flex items-center gap-4 p-4 transition-colors hover:border-brand"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-bold text-foreground">{type.name}</p>
                    {type.description && (
                      <p className="truncate text-xs text-muted-foreground">{type.description}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
