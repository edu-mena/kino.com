import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Salad } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RESTRICTION_PACKAGES } from "@/lib/dietary-packages";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/i18n";

const STORAGE_KEY = "kino_dietary_onboarding_seen";

/** Pergunta sobre restrições alimentares na primeira vez que o usuário
 * acede ao sistema (logado) — uma vez respondido (ou dispensado), nunca
 * mais volta a aparecer. Mesmo padrão de "visto uma vez" do tour de
 * onboarding (ver `@/lib/tutorial`), mas sem precisar de um Provider
 * próprio: é só um diálogo local, sem estado partilhado com o resto da app. */
export function DietaryOnboardingPopup() {
  const { t } = useTranslation();
  const { dietaryRestrictions, setDietaryRestrictions } = usePreferences();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === "done";
    } catch {
      // localStorage indisponível — trata como já visto, não insiste.
    }
    // Também não insiste se a pessoa já tem alguma restrição guardada
    // (ex: definida antes desta pergunta existir).
    if (!seen && dietaryRestrictions.length === 0) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markSeen = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      // ignora — sem storage, a pergunta volta a aparecer na próxima visita.
    }
  };

  const toggle = (label: string) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const skip = () => {
    markSeen();
    setOpen(false);
  };

  const save = () => {
    setDietaryRestrictions(selected);
    markSeen();
    setOpen(false);
    if (selected.length > 0) toast.success(t("dietaryOnboarding.savedToast"));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && skip()}>
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
