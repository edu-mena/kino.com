import type { ReactNode } from "react";

/**
 * Corpo de texto partilhado por /termos e /privacidade — as duas únicas
 * páginas da app com prosa longa (o resto do site é sempre cards/formulário
 * curto). Fora do sistema de i18n de propósito: são documentos legais, e
 * traduzir isto para en/fr sem revisão jurídica em cada língua seria pior
 * que não traduzir — ver nota nas próprias rotas.
 */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-primary">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalDocument({
  updatedAt,
  intro,
  children,
}: {
  updatedAt: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto mb-20 mt-10 max-w-3xl px-4 md:px-6">
      <p className="text-xs font-medium text-muted-foreground">Última atualização: {updatedAt}</p>
      <div className="mt-4 text-sm leading-relaxed text-muted-foreground">{intro}</div>
      {children}
    </article>
  );
}
