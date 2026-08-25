import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeading } from "@/components/admin-shell";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DishFormDialog } from "@/components/dish-form-dialog";
import { MenuManagerDialog } from "@/components/menu-manager-dialog";
import { defaultMenuId } from "@/data/menus-store";
import type { MenuItem } from "@/data/types";
import { translateMenuCategory, useTranslation } from "@/i18n";
import { formatKz } from "@/lib/format";
import { useMenuAdmin } from "@/lib/menu-admin";
import { useMenusAdmin } from "@/lib/menus-admin";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/cardapio")({
  head: () => ({ meta: [{ title: "Cardápio — Painel Kino.com" }] }),
  component: AdminCardapio,
});

function AdminCardapio() {
  const { restaurant } = useRestaurantAdmin();
  const { items, isAvailable, toggleAvailability, createItem, updateItem, deleteItem } =
    useMenuAdmin();
  const { menusByRestaurant } = useMenusAdmin();
  const { t, locale } = useTranslation();
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [menuManagerOpen, setMenuManagerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [deletingDish, setDeletingDish] = useState<MenuItem | null>(null);

  const menus = useMemo(
    () => (restaurant ? menusByRestaurant(restaurant.id) : []),
    [restaurant, menusByRestaurant],
  );

  // Garante sempre uma seleção válida — inclusive quando o cardápio ativo
  // é apagado/renomeado por baixo (ex: noutra aba).
  useEffect(() => {
    if (!restaurant) return;
    if (selectedMenuId && menus.some((m) => m.id === selectedMenuId)) return;
    setSelectedMenuId(menus[0]?.id ?? defaultMenuId(restaurant.id));
  }, [restaurant, menus, selectedMenuId]);

  if (!restaurant || !selectedMenuId) return null;

  const dishes = items.filter(
    (i) => i.restaurantId === restaurant.id && i.menuId === selectedMenuId,
  );
  const categories = [...new Set(dishes.map((i) => i.category))];

  const openCreate = () => {
    setEditingDish(null);
    setFormOpen(true);
  };

  const openEdit = (dish: MenuItem) => {
    setEditingDish(dish);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deletingDish) return;
    deleteItem(deletingDish.id);
    toast.success(t("adminCardapio.deletedToast"));
    setDeletingDish(null);
  };

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminCardapio.eyebrow")}
        title={t("adminCardapio.title")}
        description={t("adminCardapio.description")}
        action={
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="h-4 w-4" /> {t("adminCardapio.newDish")}
          </Button>
        }
      />

      <div className="mx-auto mt-6 max-w-4xl px-4 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {menus.map((menu) => (
            <button
              key={menu.id}
              type="button"
              onClick={() => setSelectedMenuId(menu.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                menu.id === selectedMenuId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary",
              )}
            >
              {menu.name}
              {!menu.isActive && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase",
                    menu.id === selectedMenuId
                      ? "bg-primary-foreground/20"
                      : "bg-surface text-muted-foreground",
                  )}
                >
                  {t("adminCardapio.draftBadge")}
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMenuManagerOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Settings2 className="h-4 w-4" /> {t("adminCardapio.manageMenus")}
          </button>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-4xl space-y-8 px-4 md:px-6">
        {categories.map((category) => (
          <section key={category}>
            <h2 className="text-lg font-extrabold text-primary">
              {translateMenuCategory(category, locale)}
            </h2>
            <div className="mt-3 card-soft divide-y divide-border">
              {dishes
                .filter((i) => i.category === category)
                .map((item) => {
                  const available = isAvailable(item.id);
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-4">
                      <img
                        src={item.image}
                        alt=""
                        className={`h-12 w-12 shrink-0 rounded-lg bg-surface object-contain ${
                          available ? "" : "grayscale opacity-60"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatKz(item.price)} · {item.portionInfo}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span
                          className={`mr-1 hidden text-xs font-semibold sm:inline ${
                            available ? "text-success" : "text-muted-foreground"
                          }`}
                        >
                          {available
                            ? t("adminCardapio.available")
                            : t("adminCardapio.unavailable")}
                        </span>
                        <Switch
                          checked={available}
                          onCheckedChange={() => toggleAvailability(item.id)}
                        />
                        <button
                          type="button"
                          aria-label={t("adminCardapio.editAria", { name: item.name })}
                          onClick={() => openEdit(item)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={t("adminCardapio.removeAria", { name: item.name })}
                          onClick={() => setDeletingDish(item)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}

        {dishes.length === 0 && (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <p className="text-sm text-muted-foreground">{t("adminCardapio.emptyText")}</p>
            <Button onClick={openCreate} className="rounded-xl">
              <Plus className="h-4 w-4" /> {t("adminCardapio.createFirst")}
            </Button>
          </div>
        )}
      </div>

      <DishFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        restaurantId={restaurant.id}
        menuId={selectedMenuId}
        categories={categories}
        dish={editingDish}
        onSave={(restaurantId, input, editingId) =>
          editingId ? updateItem(editingId, input) : createItem(restaurantId, input).ok
        }
      />

      <MenuManagerDialog
        open={menuManagerOpen}
        onOpenChange={setMenuManagerOpen}
        restaurantId={restaurant.id}
      />

      <AlertDialog open={!!deletingDish} onOpenChange={(open) => !open && setDeletingDish(null)}>
        <AlertDialogContent className="rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("adminCardapio.deleteDialogTitle", { name: deletingDish?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminCardapio.deleteDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("adminCardapio.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
