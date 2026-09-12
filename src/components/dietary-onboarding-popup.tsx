import { useState } from "react";
import { toast } from "sonner";
import { Salad } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RESTRICTION_PACKAGES } from "@/lib/dietary-packages";
import { usePreferences } from "@/lib/preferences";
import { useTutorial } from "@/lib/tutorial";
import { useTranslation } from "@/i18n";

/** Pergunta sobre restrições alimentares na primeira vez que o usuário
 * acede ao sistema (logado) — uma vez respondido (ou dispensado), nunca
 * mais volta a aparecer. Quando o card abre/fecha é decidido pelo
 * `TutorialProvider` (ver `@/lib/tutorial`), não por este componente — é o
 * que garante, por construção, que ele e o tour de onboarding nunca
 * aparecem ao mesmo tempo. */
export function DietaryOnboardingPopup() {
  const { t } = useTranslation();
  const { setDietaryRestrictions } = usePreferences();
  const { dietaryPopupOpen, resolveDietaryOnboarding } = useTutorial();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (label: string) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const skip = () => {
    resolveDietaryOnboarding();
  };

  const save = () => {
    setDietaryRestrictions(selected);
    resolveDietaryOnboarding();
    if (selected.length > 0) toast.success(t("dietaryOnboarding.savedToast"));
  };

  return (
    <Dialog open={dietaryPopupOpen} onOpenChange={(next) => !next && skip()}>
      <DialogContent className="max-w-md rounded-[2rem] border-none bg-card p-8">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success">
          <Salad className="h-6 w-6" />
        </span>
        <DialogTitle className="mt-3 font-display text-xl font-bold">
          {t("dietaryOnboarding.title")}
        </DialogTitle>
        <p className="text-sm text-muted-foreground">{t("dietaryOnboarding.description")}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {RESTRICTION_PACKAGES.map(({ label, labelKey, icon: Icon }) => {
            const on = selected.includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggle(label)}
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

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={skip}
            className="flex-1 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {t("dietaryOnboarding.skip")}
          </button>
          <Button onClick={save} className="flex-1 rounded-xl py-6 font-semibold">
            {t("dietaryOnboarding.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
