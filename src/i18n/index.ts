import { pt } from "./pt";
import { en } from "./en";
import { fr } from "./fr";
import { usePreferences } from "@/lib/preferences";

export type Dictionary = typeof pt;
export type Locale = "pt" | "en" | "fr";

const dictionaries: Record<Locale, Dictionary> = { pt, en, fr };

/** `t("entrega.title")`, `{query}` etc. interpolated via the second arg. */
type Vars = Record<string, string | number>;

// Exported (not just used internally) so lookup/interpolate can be unit
// tested directly, without mounting a component tree around useTranslation.
export function lookup(dict: Dictionary, path: string): string | undefined {
  return path.split(".").reduce<unknown>((node, key) => {
    if (node && typeof node === "object" && key in node) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict) as string | undefined;
}

export function interpolate(text: string, vars?: Vars): string {
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

/**
 * Traduz uma categoria de cardápio (ex: "Pratos Principais") quando ela é
 * uma das categorias reconhecidas em `menuCategories` — senão devolve o
 * texto tal como foi escrito. Precisa deste cuidado (em vez de `t()`) porque
 * a categoria é texto livre — o restaurante escreve o que quiser em
 * `/admin/cardapio` — e uma categoria própria/nova não pode "quebrar"
 * mostrando uma chave de tradução em bruto (o fallback de `t()` faz isso).
 */
export function translateMenuCategory(category: string, locale: Locale): string {
  const dict = dictionaries[locale].menuCategories as Record<string, string>;
  const ptDict = pt.menuCategories as Record<string, string>;
  return dict[category] ?? ptDict[category] ?? category;
}

/** ids das 3 ofertas-semente da Kino (ver `INITIAL_OFFERS` em mockData.ts) —
 * únicas ofertas com tradução própria. Ofertas criadas por um restaurante em
 * `/admin/promocoes` são conteúdo próprio dele, ficam como escreveu, em
 * qualquer idioma (mesmo critério do resto do dataset — ver README.md). */
const KINO_OFFER_KEYS: Record<
  number,
  { titleKey: keyof Dictionary["kinoOffers"]; descriptionKey: keyof Dictionary["kinoOffers"] }
> = {
  1: { titleKey: "offer1Title", descriptionKey: "offer1Description" },
  2: { titleKey: "offer2Title", descriptionKey: "offer2Description" },
  3: { titleKey: "offer3Title", descriptionKey: "offer3Description" },
};

/** `offer.id` das ofertas-semente segue o padrão "offer-1"/"offer-2"/"offer-3". */
export function translateOffer(
  offer: { id: string; title: string; description: string },
  t: ReturnType<typeof useTranslation>["t"],
): { title: string; description: string } {
  const match = /^offer-([123])$/.exec(offer.id);
  const keys = match ? KINO_OFFER_KEYS[Number(match[1])] : undefined;
  if (!keys) return { title: offer.title, description: offer.description };
  return {
    title: t(`kinoOffers.${keys.titleKey}`),
    description: t(`kinoOffers.${keys.descriptionKey}`),
  };
}
