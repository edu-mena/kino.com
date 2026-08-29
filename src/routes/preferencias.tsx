import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import icon from "@/assets/icon.png";
import { PageHeading, PageShell } from "@/components/site-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { getAllIngredientNames, getCuisines } from "@/data/helpers";
import { RESTRICTION_PACKAGES, RESTRICTION_PACKAGE_LABELS } from "@/lib/dietary-packages";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/preferencias")({
  head: () => ({
    meta: [
      { title: "Preferências — Kino.com" },
      {
        name: "description",
        content: "Ingredientes favoritos e ingredientes que não podem constar no prato.",
      },
      { property: "og:title", content: "Preferências — Kino.com" },
      { property: "og:image", content: icon },
    ],
  }),
  component: Preferencias,
});

function IngredientPicker({
  title,
  description,
  selected,
  onToggle,
  tone,
}: {
  title: string;
  description: string;
  selected: string[];
  onToggle: (name: string) => void;
  tone: "primary" | "destructive";
}) {
  const { t } = useTranslation();
  const allIngredients = useMemo(() => getAllIngredientNames(), []);
  const [query, setQuery] = useState("");
  // Ingrediente digitado sem nenhum match no cardápio, aguardando confirmação
  // do usuário antes de ser adicionado como está.
  const [pendingAdd, setPendingAdd] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const results = trimmedQuery
    ? allIngredients
        .filter((n) => n.toLowerCase().includes(trimmedQuery.toLowerCase()))
        .slice(0, 40)
    : [];
  const noMatch = trimmedQuery.length > 0 && results.length === 0;

  const addAndClear = (name: string) => {
    onToggle(name);
    setQuery("");
  };

  const chipSelectedClass =
    tone === "primary"
      ? "border-primary bg-primary/10 text-primary"
      : "border-destructive bg-destructive/10 text-destructive";

  return (
    <section className="card-soft p-6">
      <h2 className="font-display text-lg font-bold text-primary">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      {selected.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selected.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onToggle(name)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${chipSelectedClass}`}
            >
              {name}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      <label className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("preferencias.searchPlaceholder")}
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>

      {trimmedQuery && (
        <div className="mt-3 flex flex-wrap gap-2">
          {results
            .filter((name) => !selected.includes(name))
            .map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addAndClear(name)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary"
              >
                {name}
              </button>
            ))}
          {noMatch && (
            <button
              type="button"
              onClick={() => setPendingAdd(trimmedQuery)}
              className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-3 w-3" />
              {t("preferencias.addQuoted")} "{trimmedQuery}"
            </button>
          )}
        </div>
      )}

      <AlertDialog open={pendingAdd !== null} onOpenChange={(open) => !open && setPendingAdd(null)}>
        <AlertDialogContent className="rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("preferencias.confirmIngredientTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("preferencias.confirmIngredientDescription", { query: pendingAdd ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingAdd) addAndClear(pendingAdd);
                setPendingAdd(null);
              }}
            >
              {t("preferencias.yesAdd")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** Restrições alimentares — os "pacotes" (Vegetariano, Vegano, Sem
 * glúten...) são um atalho de um clique pras mais comuns; o campo livre
 * cobre o resto (alergias específicas, etc). Persiste a cada clique, sem
 * botão de guardar — mesmo padrão dos pickers de ingrediente abaixo. */
function RestrictionPackages() {
  const { t } = useTranslation();
  const { dietaryRestrictions, setDietaryRestrictions } = usePreferences();
  const extra = dietaryRestrictions.find((r) => !RESTRICTION_PACKAGE_LABELS.includes(r)) ?? "";

  const togglePackage = (label: string) => {
    const next = dietaryRestrictions.includes(label)
      ? dietaryRestrictions.filter((r) => r !== label)
      : [...dietaryRestrictions, label];
    setDietaryRestrictions(next);
  };

  const setExtra = (value: string) => {
    const withoutExtra = dietaryRestrictions.filter((r) => RESTRICTION_PACKAGE_LABELS.includes(r));
    setDietaryRestrictions(value.trim() ? [...withoutExtra, value.trim()] : withoutExtra);
  };

  return (
    <section className="card-soft p-6" id="restricoes">
      <h2 className="font-display text-lg font-bold text-primary">
        {t("preferencias.restrictionsTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("preferencias.restrictionsDescription")}
      </p>

      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {t("preferencias.restrictionPackagesLabel")}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {RESTRICTION_PACKAGES.map(({ label, labelKey, icon: Icon }) => {
          const on = dietaryRestrictions.includes(label);
          return (
            <button
              key={label}
              type="button"
              onClick={() => togglePackage(label)}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-semibold transition-colors ${
                on
                  ? "border-brand bg-brand/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-brand"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${on ? "text-brand" : ""}`} />
              <span className="truncate">{t(`home.${labelKey}`)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("preferencias.restrictionOtherLabel")}
        </p>
        <Textarea
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder={t("preferencias.restrictionOtherPlaceholder")}
          className="rounded-xl"
        />
      </div>
    </section>
  );
}

/** "Pacotes de preferências" — tipos de cozinha favoritos, base pra
 * recomendações melhores no futuro. Mesma UX de pacote-como-botão. */
function CuisinePackages() {
  const { t } = useTranslation();
  const { cuisinePreferences, setCuisinePreferences } = usePreferences();
  const cuisines = useMemo(() => getCuisines(), []);

  const toggle = (cuisine: string) => {
    setCuisinePreferences(
      cuisinePreferences.includes(cuisine)
        ? cuisinePreferences.filter((c) => c !== cuisine)
        : [...cuisinePreferences, cuisine],
    );
  };

  return (
    <section className="card-soft p-6">
      <h2 className="font-display text-lg font-bold text-primary">
        {t("preferencias.cuisinePackagesTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("preferencias.cuisinePackagesDescription")}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {cuisines.map((cuisine) => {
          const on = cuisinePreferences.includes(cuisine);
          return (
            <button
              key={cuisine}
              type="button"
              onClick={() => toggle(cuisine)}
              className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
                on
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-brand"
              }`}
            >
              {cuisine}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Preferencias() {
  const {
    favoriteIngredients,
    toggleFavoriteIngredient,
    excludedIngredients,
    toggleExcludedIngredient,
  } = usePreferences();
  const { t } = useTranslation();

  return (
    <PageShell>
      <PageHeading title={t("preferencias.title")} description={t("preferencias.description")} />
      <div className="mx-auto mt-8 max-w-6xl space-y-6 px-4 md:px-6">
        <RestrictionPackages />

        <CuisinePackages />

        <IngredientPicker
          title={t("preferencias.favoriteTitle")}
          description={t("preferencias.favoriteDescription")}
          selected={favoriteIngredients}
          onToggle={toggleFavoriteIngredient}
          tone="primary"
        />

        <IngredientPicker
          title={t("preferencias.excludedTitle")}
          description={t("preferencias.excludedDescription")}
          selected={excludedIngredients}
          onToggle={toggleExcludedIngredient}
          tone="destructive"
        />
      </div>
    </PageShell>
  );
}
