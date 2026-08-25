import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/i18n";
import { useMenusAdmin } from "@/lib/menus-admin";

/**
 * Criar, renomear, ativar/desativar e apagar cardápios de um restaurante.
 * Um cardápio desativado fica como rascunho — os pratos lá dentro somem da
 * app do cliente, mas continuam visíveis e editáveis aqui.
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
  const { menusByRestaurant, createMenu, renameMenu, toggleMenuActive, deleteMenu, menuHasDishes } =
    useMenusAdmin();
  const menus = menusByRestaurant(restaurantId);
  const { t } = useTranslation();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMenu(restaurantId, newName.trim());
    toast.success(t("menuManagerDialog.createdToast"));
    setNewName("");
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
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {menu.name}
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

        <form onSubmit={handleCreate} className="mt-4 flex items-center gap-2">
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
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("menuManagerDialog.whyMultipleMenus")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
