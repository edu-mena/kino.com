import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";

import { useTranslation } from "@/i18n";

/**
 * Fronteira de erro partilhada. Ligada como `defaultErrorComponent` do router
 * ([src/router.tsx]) — qualquer rota que rebente sem `errorComponent` próprio
 * cai aqui, em vez de partir a app inteira ou mostrar um ecrã em branco.
 */
export function RouteErrorBoundary({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const { t } = useTranslation();

  if (import.meta.env.DEV) console.error(error);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("routeError.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("routeError.description")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("routeError.retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("routeError.home")}
          </a>
        </div>
      </div>
    </div>
  );
}
