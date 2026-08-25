import { helpArticlesPt } from "./pt";
import { helpArticlesEn } from "./en";
import { helpArticlesFr } from "./fr";
import { usePreferences } from "@/lib/preferences";
import type { Locale } from "@/i18n";

export type HelpArticle = { id: string; question: string; answer: string };

const articlesByLocale: Record<Locale, HelpArticle[]> = {
  pt: helpArticlesPt,
  en: helpArticlesEn,
  fr: helpArticlesFr,
};

/**
 * FAQ da Central de Ajuda no idioma ativo (`Preferências` → idioma), com
 * fallback por artigo para português se um `id` faltar numa tradução —
 * mesma lógica de `useTranslation` em `@/i18n`, mas para dados em vez de
 * texto de interface.
 */
export function useHelpArticles(): HelpArticle[] {
  const { language } = usePreferences();
  const locale: Locale = language === "en" || language === "fr" ? language : "pt";
  const articles = articlesByLocale[locale];

  return helpArticlesPt.map(
    (ptArticle) => articles.find((a) => a.id === ptArticle.id) ?? ptArticle,
  );
}
