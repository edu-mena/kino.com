import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Salad } from "lucide-react";
import { useState } from "react";
import { RESTRICTION_PACKAGES } from "@/lib/dietary-packages";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/i18n";

/**
 * Atalho de restrição alimentar usado dentro dos cards de filtro de
 * pesquisa (busca global, cardápio) — ao clicar, abre os pacotes ali
 * mesmo (toggle direto em `dietaryRestrictions`, sem precisar sair do
 * diálogo). "Mais opções" leva pra `/preferencias`, onde também dá pra
 * definir uma restrição por texto livre.
 */
export function DietaryShortcutPicker({
  ctaLabel,
  onNavigate,
}: {
  ctaLabel: string;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const { dietaryRestrictions, setDietaryRestrictions } = usePreferences();
  const [expanded, setExpanded] = useState(false);

  const toggle = (label: string) => {
    setDietaryRestrictions(
      dietaryRestrictions.includes(label)
        ? dietaryRestrictions.filter((r) => r !== label)
        : [...dietaryRestrictions, label],
    );
  };

  return (
    <div className="mt-5 rounded-xl border border-dashed border-border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 p-3 text-left text-xs font-semibold text-muted-foreground transition-colors hover:text-brand"
      >
        <Salad className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">{ctaLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-dashed border-border p-3 pt-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {RESTRICTION_PACKAGES.map(({ label, labelKey, icon: Icon }) => {
              const on = dietaryRestrictions.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggle(label)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                    on
                      ? "border-brand bg-brand/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-brand"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${on ? "text-brand" : ""}`} />
                  <span className="truncate">{t(`home.${labelKey}`)}</span>
                </button>
              );
            })}
          </div>

          <Link
            to="/preferencias"
            onClick={onNavigate}
            className="mt-3 flex items-center gap-1 text-xs font-bold text-brand hover:underline"
          >
            {t("search.dietaryMoreOptions")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
