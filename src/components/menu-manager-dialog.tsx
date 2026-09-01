import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MENU_CATEGORY_TEMPLATES, CUSTOM_MENU_KEY } from "@/data/menu-templates";
import { useTranslation } from "@/i18n";
import { useMenusAdmin } from "@/lib/menus-admin";
import { cn } from "@/lib/utils";

/**
 * Criar, renomear, ativar/desativar e apagar cardápios de um restaurante.
 * Na criação, o gestor escolhe uma categoria (que pode trazer pratos-modelo
 * típicos) ou "Personalizado". Um cardápio desativado fica como rascunho —
 * os pratos lá dentro somem da app do cliente, mas continuam editáveis aqui.
 */
export function MenuManagerDialog({
  open,
  onOpenChange,
  restaurantId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
}) {
  const {
    menusByRestaurant,
    createMenu,
    createMenuFromCategory,
    renameMenu,
    toggleMenuActive,
    deleteMenu,
    menuHasDishes,
  } = useMenusAdmin();
  const menus = menusByRestaurant(restaurantId);
  const { t } = useTranslation();

  const [selectedKey, setSelectedKey] = useState<string>(CUSTOM_MENU_KEY);
  const [newName, setNewName] = useState("");
  const [withDishes, setWithDishes] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const templateDefaultNames = new Set(MENU_CATEGORY_TEMPLATES.map((c) => c.defaultName));
  const selectedTemplate = MENU_CATEGORY_TEMPLATES.find((c) => c.key === selectedKey);

  const pickCategory = (key: string) => {
    setSelectedKey(key);
    const template = MENU_CATEGORY_TEMPLATES.find((c) => c.key === key);
    // Só substitui o nome se ainda não foi personalizado pelo gestor.
    if (!newName.trim() || templateDefaultNames.has(newName.trim())) {
      setNewName(template?.defaultName ?? "");
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedKey === CUSTOM_MENU_KEY) {
      if (!newName.trim()) return;
      createMenu(restaurantId, newName.trim(), CUSTOM_MENU_KEY);
      toast.success(t("menuManagerDialog.createdToast"));
    } else {
      const { dishCount } = createMenuFromCategory(
        restaurantId,
        selectedKey,
        withDishes,
        newName.trim() || undefined,
      );
      toast.success(
        dishCount > 0
          ? t("menuManagerDialog.createdWithDishesToast", { count: dishCount })
          : t("menuManagerDialog.createdToast"),
      );
    }
    setNewName("");
    setSelectedKey(CUSTOM_MENU_KEY);
    setWithDishes(true);
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const confirmEdit = () => {
    if (editingId && editingName.trim()) renameMenu(editingId, editingName.trim());
    setEditingId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (menuHasDishes(id)) {
      toast.error(t("menuManagerDialog.hasDishesError", { name }));
      return;
    }
    const ok = deleteMenu(id);
    if (!ok) {
      toast.error(t("menuManagerDialog.lastMenuError"));
      return;
    }
    toast.success(t("menuManagerDialog.deletedToast"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-[1.5rem] border-none bg-card p-6">
        <DialogTitle className="font-display text-lg font-bold">
          {t("menuManagerDialog.title")}
        </DialogTitle>
        <p className="text-sm text-muted-foreground">{t("menuManagerDialog.description")}</p>

        <div className="mt-4 space-y-2">
          {menus.map((menu) => (
            <div
              key={menu.id}
              className="flex items-center gap-2 rounded-xl border border-border p-2.5"
            >
              {editingId === menu.id ? (
                <>
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmEdit()}
                    className="h-8 min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    aria-label={t("menuManagerDialog.saveNameAria")}
                    onClick={confirmEdit}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-success hover:bg-success/10"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("menuManagerDialog.cancelAria")}
                    onClick={() => setEditingId(null)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {menu.name}
                    </span>
                    {menu.category && menu.category !== CUSTOM_MENU_KEY && (
                      <span className="truncate text-[11px] font-medium text-muted-foreground">
                        {t(`menuTypes.${menu.category}`)}
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      menu.isActive ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    {menu.isActive ? t("menuManagerDialog.active") : t("menuManagerDialog.draft")}
                  </span>
                  <Switch
                    checked={menu.isActive}
                    onCheckedChange={() => toggleMenuActive(menu.id)}
                  />
                  <button
                    type="button"
                    aria-label={t("menuManagerDialog.renameAria", { name: menu.name })}
                    onClick={() => startEdit(menu.id, menu.name)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("menuManagerDialog.deleteAria", { name: menu.name })}
                    onClick={() => handleDelete(menu.id, menu.name)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleCreate} className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("menuManagerDialog.chooseTypeLabel")}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MENU_CATEGORY_TEMPLATES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => pickCategory(c.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  selectedKey === c.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary",
                )}
              >
                {t(`menuTypes.${c.key}`)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => pickCategory(CUSTOM_MENU_KEY)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                selectedKey === CUSTOM_MENU_KEY
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-dashed border-border bg-card text-muted-foreground hover:border-primary",
              )}
            >
              {t("menuManagerDialog.typeCustom")}
            </button>
          </div>

          <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("menuManagerDialog.nameLabel")}
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("menuManagerDialog.newMenuPlaceholder")}
              className="min-w-0 flex-1"
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0 rounded-xl"
              aria-label={t("menuManagerDialog.createAria")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {selectedTemplate && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
              <span className="text-xs font-medium text-foreground">
                {t("menuManagerDialog.includeTemplateDishes")}
                <span className="ml-1 text-muted-foreground">
                  ({selectedTemplate.dishes.length})
                </span>
              </span>
              <Switch checked={withDishes} onCheckedChange={setWithDishes} />
            </div>
          )}
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("menuManagerDialog.whyMultipleMenus")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
