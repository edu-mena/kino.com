import { Salad } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { usePreferences } from "@/lib/preferences";

const COMMON_RESTRICTIONS = [
  "Sem glúten",
  "Sem lactose",
  "Vegetariano",
  "Vegano",
  "Sem amendoim",
  "Sem marisco",
  "Sem picante",
];

export function DietaryPreferencesCard() {
  const { dietaryRestrictions, setDietaryRestrictions } = usePreferences();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(dietaryRestrictions);
  const [extra, setExtra] = useState(
    dietaryRestrictions.find((r) => !COMMON_RESTRICTIONS.includes(r)) ?? "",
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
            Tem alguma restrição alimentar?
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {dietaryRestrictions.length > 0
              ? dietaryRestrictions.join(", ")
              : "Nos informe o que não pode comer e avisaremos ao restaurante sempre que fizer um pedido."}
          </p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-[2rem] border-none bg-card p-8">
          <DialogTitle className="font-display text-xl font-bold">
            Restrições alimentares
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Avisamos automaticamente o restaurante sempre que fizer um pedido.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {COMMON_RESTRICTIONS.map((label) => (
              <label key={label} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={selected.includes(label)}
                  onCheckedChange={() => toggle(label)}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Outras restrições
            </p>
            <Textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="Ex: alergia a amendoim, intolerância a frutos do mar..."
              className="rounded-xl"
            />
          </div>

          <Button onClick={save} className="mt-6 w-full rounded-xl py-6 font-semibold">
            Guardar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
