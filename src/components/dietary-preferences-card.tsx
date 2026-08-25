import { Salad } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { usePreferences } from "@/lib/preferences";
import { useTranslation } from "@/i18n";

export function DietaryPreferencesCard() {
  const { t } = useTranslation();
  // Os rótulos vêm do dicionário (mudam com o idioma), mas o que fica
  // guardado em `dietaryRestrictions` — e o que se compara/mostra depois —
  // é sempre o texto em português: é o valor que viaja com o pedido no
  // checkout, e esse não se traduz (ver README do i18n).
  const COMMON_RESTRICTIONS = [
    { label: "Sem glúten", key: "restrictionGlutenFree" },
    { label: "Sem lactose", key: "restrictionLactoseFree" },
    { label: "Vegetariano", key: "restrictionVegetarian" },
    { label: "Vegano", key: "restrictionVegan" },
    { label: "Sem amendoim", key: "restrictionPeanutFree" },
    { label: "Sem marisco", key: "restrictionShellfishFree" },
    { label: "Sem picante", key: "restrictionSpicyFree" },
  ] as const;
  const commonLabels: string[] = COMMON_RESTRICTIONS.map((r) => r.label);

  const { dietaryRestrictions, setDietaryRestrictions } = usePreferences();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(dietaryRestrictions);
  const [extra, setExtra] = useState(
    dietaryRestrictions.find((r) => !commonLabels.includes(r)) ?? "",
  );

  const toggle = (label: string) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const save = () => {
    const list = extra.trim() ? [...selected, extra.trim()] : selected;
    setDietaryRestrictions(list);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="card-soft flex w-full items-center gap-4 p-5 text-left transition-colors hover:border-brand"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-success/15 text-success">
          <Salad className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-foreground">
            {t("home.dietaryQuestion")}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {dietaryRestrictions.length > 0
              ? dietaryRestrictions.join(", ")
              : t("home.dietaryHint")}
          </p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-[2rem] border-none bg-card p-8">
          <DialogTitle className="font-display text-xl font-bold">
            {t("home.dietaryDialogTitle")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{t("home.dietaryDialogDescription")}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {COMMON_RESTRICTIONS.map((r) => (
              <label key={r.label} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={selected.includes(r.label)}
                  onCheckedChange={() => toggle(r.label)}
                />
                {t(`home.${r.key}`)}
              </label>
            ))}
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("home.dietaryOtherLabel")}
            </p>
            <Textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder={t("home.dietaryOtherPlaceholder")}
              className="rounded-xl"
            />
          </div>

          <Button onClick={save} className="mt-6 w-full rounded-xl py-6 font-semibold">
            {t("home.dietarySave")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
