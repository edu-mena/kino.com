import { useEffect, useSyncExternalStore } from "react";
import { pt } from "./pt";
import { usePreferences } from "@/lib/preferences";

export type Dictionary = typeof pt;
export type Locale = "pt" | "en" | "fr";

/**
 * Só o português (língua padrão e fallback) entra no bundle inicial. Inglês
 * e francês — ~150 KB juntos, texto de UI que a maioria dos utilizadores em
 * Luanda nunca vê — são carregados sob procura na primeira vez que o locale
 * ativo os precisa. Até chegarem, `t()` devolve português.
 */
const loaders: Record<Exclude<Locale, "pt">, () => Promise<Record<string, Dictionary>>> = {
  en: () => import("./en"),
  fr: () => import("./fr"),
};

const loaded = new Map<Locale, Dictionary>([["pt", pt]]);
const pending = new Map<Locale, Promise<void>>();
let version = 0;
const listeners = new Set<() => void>();

/** Dispara o carregamento do dicionário (idempotente). */
export function loadLocale(locale: Locale): void {
  if (locale === "pt" || loaded.has(locale) || pending.has(locale)) return;
  const promise = loaders[locale]()
    .then((mod) => {
      loaded.set(locale, mod[locale] ?? (mod as { default: Dictionary }).default);
    })
    .catch(() => {
      // Fica no fallback português; tenta de novo numa próxima montagem.
    })
    .finally(() => {
      pending.delete(locale);
      version += 1;
      for (const listener of listeners) listener();
    });
  pending.set(locale, promise);
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
const getVersion = () => version;

/** Dicionário já carregado para o locale, ou `pt` como fallback. */
export function getDictionary(locale: Locale): Dictionary {
  return loaded.get(locale) ?? pt;
}

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

  // Re-renderiza quando um dicionário lazy termina de carregar.
  useSyncExternalStore(subscribe, getVersion, getVersion);

  useEffect(() => {
    if (locale !== "pt") loadLocale(locale);
  }, [locale]);

  const dict = getDictionary(locale);

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
  loadLocale(locale);
  const dict = getDictionary(locale).menuCategories as Record<string, string>;
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
