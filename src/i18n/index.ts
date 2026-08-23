import { pt } from "./pt";
import { en } from "./en";
import { fr } from "./fr";
import { usePreferences } from "@/lib/preferences";

export type Dictionary = typeof pt;
export type Locale = "pt" | "en" | "fr";

const dictionaries: Record<Locale, Dictionary> = { pt, en, fr };

/** `t("entrega.title")`, `{query}` etc. interpolated via the second arg. */
type Vars = Record<string, string | number>;

function lookup(dict: Dictionary, path: string): string | undefined {
  return path.split(".").reduce<unknown>((node, key) => {
    if (node && typeof node === "object" && key in node) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict) as string | undefined;
}

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

/**
 * `t("entrega.eta")` → string traduzida na língua ativa (`Preferências` →
 * idioma), com fallback para português se a chave faltar numa tradução.
 * Conteúdo de dados (nomes de restaurantes/pratos, moradas, preços) nunca
 * passa por aqui — só texto de interface fixo. Ver `README.md`.
 */
export function useTranslation() {
  const { language } = usePreferences();
  const locale: Locale = language === "en" || language === "fr" ? language : "pt";
  const dict = dictionaries[locale];

  const t = (path: string, vars?: Vars): string => {
    const value = lookup(dict, path) ?? lookup(pt, path) ?? path;
    return interpolate(value, vars);
  };

  return { t, locale };
}
