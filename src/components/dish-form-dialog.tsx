import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ImageUploadField } from "@/components/image-upload-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import icon from "@/assets/icon.png";
import { FirstUseHint } from "@/components/first-use-hint";
import { getEffectiveMenuItems, normalizeIngredients, type MenuItemInput } from "@/data/menu-store";
import type { MenuItem, MenuItemIngredient } from "@/data/types";
import { useTranslation } from "@/i18n";
import { useFirstUseHint } from "@/lib/first-use-hints";
import { cn } from "@/lib/utils";

type IngredientRow = {
  id?: string;
  name: string;
  kind: "main" | "extra";
  extraPrice: string;
};

function toRows(ingredients: MenuItemIngredient[]): IngredientRow[] {
  return ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    kind: i.extraPrice ? "extra" : "main",
    extraPrice: i.extraPrice ? String(i.extraPrice) : "",
  }));
}

const emptyRow: IngredientRow = { name: "", kind: "main", extraPrice: "" };

// Um prato por nome (o mais recente) — base para a sugestão de nome e o
// preenchimento automático ao escolher uma sugestão. Inclui pratos de
// qualquer restaurante/cardápio: o objetivo é poupar trabalho de digitação
// a qualquer restaurante que sirva o "mesmo" prato (ex: "Muamba de
// Galinha"), não só repetir os pratos já criados por este restaurante.
function useDishSuggestions() {
  return useMemo(() => {
    const items = getEffectiveMenuItems({ activeMenusOnly: false });
    const byName = new Map<string, MenuItem>();
    for (const item of items) {
      if (!byName.has(item.name.toLowerCase())) byName.set(item.name.toLowerCase(), item);
    }
    return [...byName.values()];
  }, []);
}

/**
 * Formulário de criar/editar prato do painel do restaurante. Sem `dish` é
 * modo criação; com `dish`, edição (campos pré-preenchidos, `id` mantido).
 *
 * Ingredientes: "principal" é o que já vem no prato por omissão (o cliente
 * pode desmarcá-lo ao pedir); "adicional" tem um preço extra opcional (ex:
 * "Bacon extra") — mesma distinção que a página do prato (`/prato/$dishId`)
 * já usa para separar as duas listas.
 */
export function DishFormDialog({
  open,
  onOpenChange,
  restaurantId,
  menuId,
  categories,
  dish,
  kind = "dish",
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  menuId: string;
  categories: string[];
  dish?: MenuItem | null;
  /** "drink" só muda os rótulos e pré-seleciona a categoria "Bebidas" — o
   * modelo de dados é o mesmo (`MenuItem`). */
  kind?: "dish" | "drink";
  /** `false` = a escrita falhou (ex: quota do localStorage excedida). */
  onSave: (restaurantId: string, input: MenuItemInput, editingId?: string) => boolean;
}) {
  const suggestions = useDishSuggestions();
  const { t } = useTranslation();
  const dishHint = useFirstUseHint("dish");

  const [name, setName] = useState("");
  const [nameSuggestionsOpen, setNameSuggestionsOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [portionInfo, setPortionInfo] = useState("");
  const [prepTimeMinutes, setPrepTimeMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([]);

  // Reabastece o formulário sempre que o diálogo abre — quer para um prato
  // novo (tudo vazio) quer para editar um existente (campos preenchidos).
  useEffect(() => {
    if (!open) return;
    setName(dish?.name ?? "");
    setCategory(dish?.category ?? (kind === "drink" ? "Bebidas" : ""));
    setPrice(dish ? String(dish.price) : "");
    setPortionInfo(dish?.portionInfo ?? "");
    setPrepTimeMinutes(dish ? String(dish.prepTimeMinutes) : "");
    setDescription(dish?.description ?? "");
    setImage(dish?.image ?? "");
    setIngredientRows(dish ? toRows(dish.ingredients) : []);
  }, [open, dish, kind]);

  const nameSuggestions =
    !dish && name.trim().length >= 2
      ? suggestions
          .filter((s) => s.name.toLowerCase().includes(name.trim().toLowerCase()))
          .slice(0, 6)
      : [];

  // Ao escolher uma sugestão: preenche tudo o que costuma ser igual entre
  // restaurantes que servem o mesmo prato (categoria, descrição, porção,
  // tempo de preparo, imagem, ingredientes) — menos o preço, que cada
  // restaurante define por si (não faz sentido copiar o de outro).
  const applySuggestion = (suggestion: MenuItem) => {
    setName(suggestion.name);
    setCategory(suggestion.category);
    setPortionInfo(suggestion.portionInfo);
    setPrepTimeMinutes(String(suggestion.prepTimeMinutes));
    setDescription(suggestion.description);
    setImage(suggestion.image);
    setIngredientRows(toRows(suggestion.ingredients));
    setNameSuggestionsOpen(false);
    toast.success(t("dishFormDialog.suggestionAppliedToast", { name: suggestion.name }));
  };

  const updateRow = (index: number, patch: Partial<IngredientRow>) =>
    setIngredientRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const removeRow = (index: number) =>
    setIngredientRows((rows) => rows.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Number(price);
    if (!name.trim() || !category.trim() || !priceNum || priceNum <= 0) {
      toast.error(t("dishFormDialog.missingFieldsError"));
      return;
    }

    const input: MenuItemInput = {
      menuId,
      name: name.trim(),
      description: description.trim(),
      price: priceNum,
      category: category.trim(),
      image: image.trim() || icon,
      portionInfo: portionInfo.trim() || "1 pessoa",
      prepTimeMinutes: Number(prepTimeMinutes) || 15,
      ingredients: normalizeIngredients(
        ingredientRows.map((r) => ({
          id: r.id,
          name: r.name,
          removable: r.kind === "main",
          extraPrice: r.kind === "extra" ? Number(r.extraPrice) || 0 : undefined,
        })),
      ),
    };

    const ok = onSave(restaurantId, input, dish?.id);
    if (!ok) {
      toast.error(t("dishFormDialog.saveFailedError"));
      return;
    }
    toast.success(
      dish
        ? t("dishFormDialog.updatedToast")
        : t(kind === "drink" ? "dishFormDialog.createdDrinkToast" : "dishFormDialog.createdToast"),
    );
    if (!dish) dishHint.dismiss();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-[1.5rem] border-none bg-card p-6">
        <DialogTitle className="font-display text-lg font-bold">
          {dish
            ? t(kind === "drink" ? "dishFormDialog.editDrinkTitle" : "dishFormDialog.editTitle")
            : t(kind === "drink" ? "dishFormDialog.newDrinkTitle" : "dishFormDialog.newTitle")}
        </DialogTitle>
        <DialogDescription>
          {dish
            ? t("dishFormDialog.editDescription")
            : t(
                kind === "drink"
                  ? "dishFormDialog.newDrinkDescription"
                  : "dishFormDialog.newDescription",
              )}
        </DialogDescription>

        {!dish && dishHint.shouldShow && (
          <FirstUseHint text={t("dishFormDialog.firstUseHint")} onDismiss={dishHint.dismiss} />
        )}

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="relative space-y-1.5">
            <Label htmlFor="dish-name">{t("dishFormDialog.nameLabel")}</Label>
            <Input
              id="dish-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameSuggestionsOpen(true);
              }}
              onFocus={() => setNameSuggestionsOpen(true)}
              onBlur={() => setTimeout(() => setNameSuggestionsOpen(false), 150)}
              placeholder={t("dishFormDialog.namePlaceholder")}
              autoComplete="off"
              required
            />
            {nameSuggestionsOpen && nameSuggestions.length > 0 && (
              <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
                <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("dishFormDialog.suggestionsHint")}
                </p>
                {nameSuggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySuggestion(s)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface"
                  >
                    <img
                      src={s.image}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-md bg-surface object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{s.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.category}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dish-category">{t("dishFormDialog.categoryLabel")}</Label>
              <Input
                id="dish-category"
                list="dish-category-options"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t("dishFormDialog.categoryPlaceholder")}
                required
              />
              <datalist id="dish-category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dish-price">{t("dishFormDialog.priceLabel")}</Label>
              <Input
                id="dish-price"
                type="number"
                min={1}
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dish-portion">{t("dishFormDialog.portionLabel")}</Label>
              <Input
                id="dish-portion"
                value={portionInfo}
                onChange={(e) => setPortionInfo(e.target.value)}
                placeholder={t("dishFormDialog.portionPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dish-prep-time">{t("dishFormDialog.prepTimeLabel")}</Label>
              <Input
                id="dish-prep-time"
                type="number"
                min={1}
                value={prepTimeMinutes}
                onChange={(e) => setPrepTimeMinutes(e.target.value)}
                placeholder="15"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dish-description">{t("dishFormDialog.descriptionLabel")}</Label>
            <Textarea
              id="dish-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("dishFormDialog.descriptionPlaceholder")}
              className="rounded-xl"
            />
          </div>

          <ImageUploadField
            value={image}
            onChange={setImage}
            onUploadingChange={setImageUploading}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("dishFormDialog.ingredientsLabel")}</Label>
              <button
                type="button"
                onClick={() => setIngredientRows((rows) => [...rows, { ...emptyRow }])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
              >
                <Plus className="h-3.5 w-3.5" /> {t("dishFormDialog.addIngredient")}
              </button>
            </div>

            {ingredientRows.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("dishFormDialog.noIngredientsHint")}
              </p>
            )}

            <div className="space-y-2">
              {ingredientRows.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2"
                >
                  <Input
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                    placeholder={t("dishFormDialog.ingredientNamePlaceholder")}
                    className="min-w-0"
                  />
                  <select
                    value={row.kind}
                    onChange={(e) =>
                      updateRow(index, { kind: e.target.value as IngredientRow["kind"] })
                    }
                    className={cn(
                      "h-9 shrink-0 rounded-xl border border-border bg-background px-2 text-xs",
                    )}
                  >
                    <option value="main">{t("dishFormDialog.kindMain")}</option>
                    <option value="extra">{t("dishFormDialog.kindExtra")}</option>
                  </select>
                  {row.kind === "extra" ? (
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={row.extraPrice}
                      onChange={(e) => updateRow(index, { extraPrice: e.target.value })}
                      placeholder={t("dishFormDialog.extraPricePlaceholder")}
                      className="w-20 shrink-0"
                    />
                  ) : (
                    <span className="w-20 shrink-0" />
                  )}
                  <button
                    type="button"
                    aria-label={t("dishFormDialog.removeIngredientAria")}
                    onClick={() => removeRow(index)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">{t("dishFormDialog.kindMain")}</span>:{" "}
              {t("dishFormDialog.ingredientsHintMain")}{" "}
              <span className="font-semibold">{t("dishFormDialog.kindExtra")}</span>:{" "}
              {t("dishFormDialog.ingredientsHintExtra")}
            </p>
          </div>

          <Button type="submit" disabled={imageUploading} className="w-full rounded-xl">
            {dish
              ? t("dishFormDialog.saveChanges")
              : t(kind === "drink" ? "dishFormDialog.createDrink" : "dishFormDialog.createDish")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
