import { Link } from "@tanstack/react-router";
import { ChevronRight, Salad } from "lucide-react";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/i18n";

/** Resumo das restrições alimentares na home — link direto pra
 * `/preferencias`, onde a edição de verdade acontece (pacotes de
 * restrição + lista livre). Antes tinha o seu próprio diálogo, duplicando
 * a mesma informação já editável em Preferências; agora os dois ficam
 * conectados a uma única fonte. */
export function DietaryPreferencesCard() {
  const { t } = useTranslation();
  const { dietaryRestrictions } = usePreferences();

  return (
    <Link
      to="/preferencias"
      className="card-soft flex w-full items-center gap-4 p-5 text-left transition-colors hover:border-brand"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-success/15 text-success">
        <Salad className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-bold text-foreground">
          {t("home.dietaryQuestion")}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {dietaryRestrictions.length > 0 ? dietaryRestrictions.join(", ") : t("home.dietaryHint")}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
