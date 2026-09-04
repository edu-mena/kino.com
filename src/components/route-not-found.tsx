import { useTranslation } from "@/i18n";

/**
 * Ecrã 404 partilhado. Ligado como `defaultNotFoundComponent` do router
 * ([src/router.tsx]) e reutilizado no `__root`.
 */
export function RouteNotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("notFound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFound.description")}</p>
        <div className="mt-6">
          {/* `<a>` e não `<Link>`: um 404 costuma vir de estado de rota mau —
              recarregar a página limpa-o. Também torna o componente
              independente do router (usado como default do router). */}
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("notFound.home")}
          </a>
        </div>
      </div>
    </div>
  );
}
