import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  FileDown,
  LayoutGrid,
  Pencil,
  Plus,
  QrCode,
  Search,
  Settings2,
  Share2,
  Trash2,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeading, RestaurantGate } from "@/components/admin-shell";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { DishFormDialog } from "@/components/dish-form-dialog";
import { MenuManagerDialog } from "@/components/menu-manager-dialog";
import { MenuQrDialog } from "@/components/menu-qr-dialog";
import { defaultMenuId } from "@/data/menus-store";
import { normalizeIngredients, type MenuItemInput } from "@/data/menu-store";
import type { MenuItem } from "@/data/types";
import { translateMenuCategory, useTranslation } from "@/i18n";
import { formatKz } from "@/lib/format";
import { useMenuAdmin } from "@/lib/menu-admin";
import { useMenusAdmin } from "@/lib/menus-admin";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/cardapio")({
  head: () => ({ meta: [{ title: "Cardápio — Painel Kino.com" }] }),
  component: () => (
    <RestaurantGate>
      <AdminCardapio />
    </RestaurantGate>
  ),
});

type AvailFilter = "todos" | "sim" | "nao";
type SortKey = "nome" | "preco-asc" | "preco-desc" | "categoria";

const selectClass =
  "rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground accent-brand outline-none transition-colors focus:border-brand focus:text-brand";

function AdminCardapio() {
  const { restaurant } = useRestaurantAdmin();
  const { items, isAvailable, toggleAvailability, createItem, updateItem, deleteItem } =
    useMenuAdmin();
  const { menusByRestaurant } = useMenusAdmin();
  const { t, locale } = useTranslation();

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [menuManagerOpen, setMenuManagerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<"dish" | "drink">("dish");
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [deletingDish, setDeletingDish] = useState<MenuItem | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [availFilter, setAvailFilter] = useState<AvailFilter>("todos");
  const [sortKey, setSortKey] = useState<SortKey>("categoria");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Formulário de novo ingrediente (card de detalhe)
  const [ingName, setIngName] = useState("");
  const [ingKind, setIngKind] = useState<"main" | "extra">("main");
  const [ingExtra, setIngExtra] = useState("");
  const [priceDraft, setPriceDraft] = useState("");

  const menus = useMemo(
    () => (restaurant ? menusByRestaurant(restaurant.id) : []),
    [restaurant, menusByRestaurant],
  );

  useEffect(() => {
    if (!restaurant) return;
    if (selectedMenuId && menus.some((m) => m.id === selectedMenuId)) return;
    setSelectedMenuId(menus[0]?.id ?? defaultMenuId(restaurant.id));
  }, [restaurant, menus, selectedMenuId]);

  const dishes = useMemo(
    () =>
      restaurant && selectedMenuId
        ? items.filter((i) => i.restaurantId === restaurant.id && i.menuId === selectedMenuId)
        : [],
    [items, restaurant, selectedMenuId],
  );

  const categories = useMemo(() => [...new Set(dishes.map((i) => i.category))], [dishes]);

  const list = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const rows = dishes.filter((d) => {
      if (categoryFilter !== "todas" && d.category !== categoryFilter) return false;
      const avail = d.isAvailable;
      if (availFilter === "sim" && !avail) return false;
      if (availFilter === "nao" && avail) return false;
      if (
        q &&
        !d.name.toLowerCase().includes(q) &&
        !d.ingredients.some((i) => i.name.toLowerCase().includes(q))
      )
        return false;
      return true;
    });
    return rows.sort((a, b) => {
      if (sortKey === "preco-asc") return a.price - b.price;
      if (sortKey === "preco-desc") return b.price - a.price;
      if (sortKey === "categoria")
        return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }, [dishes, debouncedQuery, categoryFilter, availFilter, sortKey]);

  const active = useMemo(
    () => (activeId ? (dishes.find((d) => d.id === activeId) ?? null) : null),
    [activeId, dishes],
  );

  // Ressincroniza os rascunhos do card sempre que muda o prato selecionado
  // (ou os dados dele, ex: depois de guardar). `active` é memoizado, por isso
  // isto NÃO corre a cada tecla no campo de novo ingrediente.
  useEffect(() => {
    setPriceDraft(active ? String(active.price) : "");
    setIngName("");
    setIngExtra("");
    setIngKind("main");
  }, [active]);

  const metrics = useMemo(() => {
    const total = dishes.length || 1;
    const availableCount = dishes.filter((d) => d.isAvailable).length;
    const prices = dishes.map((d) => d.price);
    const catCounts = [...new Set(dishes.map((d) => d.category))]
      .map((c) => ({
        label: translateMenuCategory(c, locale),
        count: dishes.filter((d) => d.category === c).length,
      }))
      .sort((a, b) => b.count - a.count);
    return {
      total: dishes.length,
      availableCount,
      unavailableCount: dishes.length - availableCount,
      availablePct: Math.round((availableCount / total) * 100),
      unavailablePct: Math.round(((dishes.length - availableCount) / total) * 100),
      avgPrice: prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : 0,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      categoryCount: categories.length,
      catCounts,
    };
  }, [dishes, categories, locale]);

  if (!restaurant || !selectedMenuId) return null;

  const menuId = selectedMenuId;

  const openCreate = (kind: "dish" | "drink" = "dish") => {
    setEditingDish(null);
    setFormKind(kind);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deletingDish) return;
    if (activeId === deletingDish.id) setActiveId(null);
    deleteItem(deletingDish.id);
    toast.success(t("adminCardapio.deletedToast"));
    setDeletingDish(null);
  };

  /** Envia uma edição parcial de `dish` — o store só aceita o input completo. */
  const applyDishPatch = (dish: MenuItem, patch: Partial<MenuItemInput>, successKey: string) => {
    const ok = updateItem(dish.id, {
      menuId: dish.menuId ?? menuId,
      name: dish.name,
      description: dish.description,
      price: dish.price,
      category: dish.category,
      image: dish.image,
      portionInfo: dish.portionInfo,
      prepTimeMinutes: dish.prepTimeMinutes,
      ingredients: dish.ingredients,
      ...patch,
    });
    if (!ok) toast.error(t("dishFormDialog.saveFailedError"));
    else toast.success(t(successKey));
    return ok;
  };

  const addIngredient = () => {
    if (!active || !ingName.trim()) return;
    const next = normalizeIngredients([
      ...active.ingredients,
      {
        name: ingName,
        removable: ingKind === "main",
        extraPrice: ingKind === "extra" ? Number(ingExtra) || 0 : undefined,
      },
    ]);
    if (applyDishPatch(active, { ingredients: next }, "adminCardapio.ingredientAddedToast")) {
      setIngName("");
      setIngExtra("");
      setIngKind("main");
    }
  };

  const removeIngredient = (ingId: string) => {
    if (!active) return;
    applyDishPatch(
      active,
      { ingredients: active.ingredients.filter((i) => i.id !== ingId) },
      "adminCardapio.ingredientRemovedToast",
    );
  };

  const savePrice = () => {
    if (!active) return;
    const p = Number(priceDraft);
    if (!p || p <= 0) {
      toast.error(t("dishFormDialog.missingFieldsError"));
      return;
    }
    applyDishPatch(active, { price: p }, "dishFormDialog.updatedToast");
  };

  const categoryOptions = ["todas", ...categories];

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminCardapio.eyebrow")}
        title={t("adminCardapio.title")}
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <Share2 className="h-4 w-4" /> {t("adminCardapio.shareMenu")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setQrOpen(true)}>
                <QrCode className="h-4 w-4" /> {t("adminCardapio.qrCode")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  window.open(`/admin/cardapio-pdf?menu=${selectedMenuId}`, "_blank", "noopener")
                }
              >
                <FileDown className="h-4 w-4" /> {t("adminCardapio.exportPdfThis")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => window.open("/admin/cardapio-pdf?menu=all", "_blank", "noopener")}
              >
                <FileDown className="h-4 w-4" /> {t("adminCardapio.exportPdfAll")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
        {/* Seletor de cardápios — abas assentes numa linha cinza */}
        <div className="flex flex-wrap items-end gap-2 border-b border-border">
          {menus.map((menu) => (
            <button
              key={menu.id}
              type="button"
              onClick={() => {
                setSelectedMenuId(menu.id);
                setActiveId(null);
              }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-t-2xl rounded-b-none border border-b-0 px-4 py-2 text-sm font-semibold transition-colors",
                menu.id === selectedMenuId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary",
              )}
            >
              {menu.name}
              {menu.category && menu.category !== "personalizado" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    menu.id === selectedMenuId
                      ? "bg-primary-foreground/20"
                      : "bg-surface text-muted-foreground",
                  )}
                >
                  {t(`menuTypes.${menu.category}`)}
                </span>
              )}
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
            className="flex shrink-0 items-center gap-1.5 rounded-t-2xl rounded-b-none border border-b-0 border-dashed border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Settings2 className="h-4 w-4" /> {t("adminCardapio.manageMenus")}
          </button>
        </div>

        {dishes.length === 0 ? (
          <div className="card-soft mt-6 grid place-items-center gap-3 p-12 text-center">
            <Utensils className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("adminCardapio.emptyText")}</p>
            <Button onClick={() => openCreate("dish")} className="rounded-xl">
              <Plus className="h-4 w-4" /> {t("adminCardapio.createFirst")}
            </Button>
          </div>
        ) : (
          <>
            {/* Pesquisa + filtros */}
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 transition-colors focus-within:border-brand has-[:focus]:text-brand sm:max-w-xs">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("adminCardapio.searchPlaceholder")}
                  className="w-full min-w-0 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={selectClass}
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c === "todas"
                      ? t("adminCardapio.filterCategoryAll")
                      : translateMenuCategory(c, locale)}
                  </option>
                ))}
              </select>

              <select
                value={availFilter}
                onChange={(e) => setAvailFilter(e.target.value as AvailFilter)}
                className={selectClass}
              >
                <option value="todos">{t("adminCardapio.filterAvailAll")}</option>
                <option value="sim">{t("adminCardapio.filterAvailYes")}</option>
                <option value="nao">{t("adminCardapio.filterAvailNo")}</option>
              </select>

              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className={selectClass}
              >
                <option value="categoria">{t("adminCardapio.sortCategory")}</option>
                <option value="nome">{t("adminCardapio.sortName")}</option>
                <option value="preco-asc">{t("adminCardapio.sortPriceAsc")}</option>
                <option value="preco-desc">{t("adminCardapio.sortPriceDesc")}</option>
              </select>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              {/* Lista */}
              <div className={`min-w-0 ${activeId ? "hidden lg:block" : "block"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("adminCardapio.resultsCount", { count: list.length })}
                  </p>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => openCreate("drink")}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                    >
                      <Plus className="h-3.5 w-3.5" /> {t("adminCardapio.newDrink")}
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreate("dish")}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      <Plus className="h-3.5 w-3.5" /> {t("adminCardapio.newDish")}
                    </button>
                  </div>
                </div>

                <div className="card-soft mt-2 overflow-hidden p-[5px]">
                  <div className="mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] gap-3 rounded-[20rem] bg-primary px-6 py-4 text-sm font-bold uppercase tracking-wide text-white">
                    <span>{t("adminCardapio.colDish")}</span>
                    <span className="text-right">{t("adminCardapio.colPrice")}</span>
                    <span className="pl-3 text-right">{t("adminCardapio.colStatus")}</span>
                  </div>

                  <div>
                    {list.map((d, i) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setActiveId(d.id)}
                        className={`mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[20rem] px-4 py-2.5 text-left transition-colors last:mb-0 ${
                          activeId === d.id
                            ? "bg-primary/10"
                            : i % 2 === 1
                              ? "bg-surface/70 hover:bg-primary/5"
                              : "hover:bg-primary/5"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <img
                            src={d.image}
                            alt=""
                            className={`h-10 w-10 shrink-0 rounded-full bg-surface object-cover ${
                              d.isAvailable ? "" : "opacity-50 grayscale"
                            }`}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {d.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {translateMenuCategory(d.category, locale)}
                            </span>
                          </span>
                        </span>
                        <span className="text-right text-xs font-semibold text-foreground">
                          {formatKz(d.price)}
                        </span>
                        <span className="flex items-center gap-1 pl-3">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              d.isAvailable ? "bg-success" : "bg-muted-foreground/40"
                            }`}
                          />
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </span>
                      </button>
                    ))}
                    {list.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        {t("adminCardapio.emptyNoResults")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card de visualização + operações */}
              <div className={`min-w-0 ${activeId ? "block" : "hidden lg:block"}`}>
                <div className="card-soft sticky top-24 p-6 lg:top-6">
                  {active ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveId(null)}
                        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary lg:hidden"
                      >
                        <ChevronLeft className="h-4 w-4" /> {t("common.back")}
                      </button>

                      <div className="flex items-start gap-3">
                        <img
                          src={active.image}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-2xl bg-surface object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <h2 className="font-display text-lg font-bold text-primary">
                            {active.name}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {translateMenuCategory(active.category, locale)} · {active.portionInfo}
                          </p>
                        </div>
                      </div>

                      {active.description && (
                        <p className="mt-3 rounded-lg bg-surface p-3 text-sm text-foreground">
                          {active.description}
                        </p>
                      )}

                      {/* Disponibilidade */}
                      <div className="mt-4 flex items-center justify-between rounded-xl border border-border px-4 py-3">
                        <span className="text-sm font-medium text-foreground">
                          {t("adminCardapio.availabilityLabel")}
                        </span>
                        <Switch
                          checked={isAvailable(active.id)}
                          onCheckedChange={() => toggleAvailability(active.id)}
                        />
                      </div>

                      {/* Preço */}
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {t("dishFormDialog.priceLabel")}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            step="any"
                            value={priceDraft}
                            onChange={(e) => setPriceDraft(e.target.value)}
                            className="w-32 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
                          />
                          {Number(priceDraft) !== active.price && (
                            <Button size="sm" onClick={savePrice} className="rounded-lg">
                              {t("adminCardapio.savePrice")}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Ingredientes */}
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {t("adminCardapio.ingredientsTitle")}
                        </p>

                        {active.ingredients.length === 0 ? (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {t("dishFormDialog.noIngredientsHint")}
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {active.ingredients.map((ing) => (
                              <li
                                key={ing.id}
                                className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 text-xs"
                              >
                                <span className="min-w-0 truncate text-foreground">
                                  {ing.name}
                                  <span className="ml-2 rounded-full bg-card px-1.5 py-0.5 font-bold text-muted-foreground">
                                    {ing.extraPrice
                                      ? `${t("dishFormDialog.kindExtra")} · ${formatKz(ing.extraPrice)}`
                                      : t("dishFormDialog.kindMain")}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  aria-label={t("dishFormDialog.removeIngredientAria")}
                                  onClick={() => removeIngredient(ing.id)}
                                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Adicionar ingrediente */}
                        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                          <input
                            value={ingName}
                            onChange={(e) => setIngName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addIngredient()}
                            placeholder={t("dishFormDialog.ingredientNamePlaceholder")}
                            className="min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
                          />
                          <button
                            type="button"
                            onClick={addIngredient}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-brand-foreground transition-opacity hover:opacity-90"
                          >
                            <Plus className="h-3.5 w-3.5" /> {t("dishFormDialog.addIngredient")}
                          </button>
                          <select
                            value={ingKind}
                            onChange={(e) => setIngKind(e.target.value as "main" | "extra")}
                            className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none focus:border-brand"
                          >
                            <option value="main">{t("dishFormDialog.kindMain")}</option>
                            <option value="extra">{t("dishFormDialog.kindExtra")}</option>
                          </select>
                          {ingKind === "extra" && (
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={ingExtra}
                              onChange={(e) => setIngExtra(e.target.value)}
                              placeholder={t("dishFormDialog.extraPricePlaceholder")}
                              className="w-24 rounded-lg border border-border bg-card px-3 py-1.5 text-xs outline-none focus:border-brand"
                            />
                          )}
                        </div>
                      </div>

                      {/* Outras operações */}
                      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDish(active);
                            setFormKind(active.category === "Bebidas" ? "drink" : "dish");
                            setFormOpen(true);
                          }}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                        >
                          <Pencil className="h-3.5 w-3.5" /> {t("adminCardapio.editFull")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingDish(active)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-destructive/50 px-4 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t("adminCardapio.deleteDish")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="grid place-items-center gap-3 py-12 text-center">
                      <Utensils className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t("adminCardapio.chooseHint")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <section className="mt-12">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="font-display text-lg font-bold text-foreground">
                  {t("adminCardapio.statsTitle")}
                </h2>
                <p className="text-xs text-muted-foreground">{t("adminCardapio.statsHint")}</p>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="card-soft p-5 sm:p-6">
                  <h3 className="text-sm font-bold text-foreground">
                    {t("adminCardapio.availabilityDistTitle")}
                  </h3>
                  <div className="mt-5 space-y-4">
                    <Bar
                      label={t("adminCardapio.available")}
                      count={metrics.availableCount}
                      pct={metrics.availablePct}
                      tone="bg-success"
                    />
                    <Bar
                      label={t("adminCardapio.unavailable")}
                      count={metrics.unavailableCount}
                      pct={metrics.unavailablePct}
                      tone="bg-muted-foreground/40"
                    />
                  </div>
                </div>

                <div className="card-soft p-5 sm:p-6 lg:col-span-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {t("adminCardapio.categoryDistTitle")}
                  </h3>
                  <div className="mt-5 space-y-3">
                    {metrics.catCounts.slice(0, 8).map((c) => (
                      <Bar
                        key={c.label}
                        label={c.label}
                        count={c.count}
                        pct={Math.round((c.count / (metrics.total || 1)) * 100)}
                        tone="bg-primary"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="card-soft p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Utensils className="h-4 w-4 text-primary" />
                    {t("adminCardapio.kpiTotal")}
                  </div>
                  <p className="mt-3 font-display text-4xl font-extrabold text-foreground">
                    {metrics.total}
                  </p>
                </div>

                <div className="card-soft p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Coins className="h-4 w-4 text-brand" />
                    {t("adminCardapio.kpiAvgPrice")}
                  </div>
                  <p className="mt-3 font-display text-3xl font-extrabold text-brand">
                    {formatKz(metrics.avgPrice)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatKz(metrics.minPrice)} – {formatKz(metrics.maxPrice)}
                  </p>
                </div>

                <div className="card-soft p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                    {t("adminCardapio.kpiCategories")}
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{metrics.categoryCount}</p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <DishFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        restaurantId={restaurant.id}
        menuId={menuId}
        categories={categories}
        dish={editingDish}
        kind={formKind}
        onSave={(restaurantId, input, editingId) =>
          editingId ? updateItem(editingId, input) : createItem(restaurantId, input).ok
        }
      />

      <MenuManagerDialog
        open={menuManagerOpen}
        onOpenChange={setMenuManagerOpen}
        restaurantId={restaurant.id}
      />

      <MenuQrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
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

function Bar({
  label,
  count,
  pct,
  tone,
}: {
  label: string;
  count: number;
  pct: number;
  tone: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="min-w-0 truncate font-medium text-foreground">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          <span className="font-bold text-foreground">{count}</span> · {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  );
}
