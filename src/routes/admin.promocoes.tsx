import { createFileRoute } from "@tanstack/react-router";
import {
  Bike,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Percent,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ADMIN_FILTER_SELECT,
  AdminField,
  KpiTile,
  MiniProgress,
  StatBars,
  StatCard,
  StatSection,
} from "@/components/admin-stats";
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
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FirstUseHint } from "@/components/first-use-hint";
import type { Offer } from "@/data/types";
import { useTranslation } from "@/i18n";
import { useFirstUseHint } from "@/lib/first-use-hints";
import { useOffersAdmin } from "@/lib/offers-admin";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useDebouncedValue } from "@/lib/use-debounced-value";

export const Route = createFileRoute("/admin/promocoes")({
  head: () => ({ meta: [{ title: "Promoções — Painel Kino.com" }] }),
  component: () => (
    <RestaurantGate>
      <AdminPromocoes />
    </RestaurantGate>
  ),
});

const OFFER_TYPES: Offer["type"][] = ["discount", "delivery", "happy-hour"];
const iconByType = { discount: Percent, delivery: Bike, "happy-hour": Sparkles } as const;
type TypeFilter = "todos" | Offer["type"];
type SortKey = "nome" | "tipo";

function AdminPromocoes() {
  const { restaurant } = useRestaurantAdmin();
  const { offersByRestaurant, createOffer, updateOffer, deleteOffer } = useOffersAdmin();
  const { t } = useTranslation();
  const promoHint = useFirstUseHint("promo");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [deleting, setDeleting] = useState<Offer | null>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todos");
  const [sortKey, setSortKey] = useState<SortKey>("tipo");
  const [activeId, setActiveId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Offer["type"]>("discount");
  const [code, setCode] = useState("");

  const typeLabels = useMemo<Record<Offer["type"], string>>(
    () => ({
      discount: t("adminPromocoes.typeDiscount"),
      delivery: t("adminPromocoes.typeDelivery"),
      "happy-hour": t("adminPromocoes.typeHappyHour"),
    }),
    [t],
  );

  useEffect(() => {
    if (!formOpen) return;
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setType(editing?.type ?? "discount");
    setCode(editing?.code ?? "");
  }, [formOpen, editing]);

  const offers = useMemo(
    () => (restaurant ? offersByRestaurant(restaurant.id) : []),
    [restaurant, offersByRestaurant],
  );

  const list = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const rows = offers.filter((o) => {
      if (typeFilter !== "todos" && o.type !== typeFilter) return false;
      if (q && ![o.title, o.description, o.code ?? ""].some((v) => v.toLowerCase().includes(q)))
        return false;
      return true;
    });
    return [...rows].sort((a, b) =>
      sortKey === "nome"
        ? a.title.localeCompare(b.title)
        : a.type.localeCompare(b.type) || a.title.localeCompare(b.title),
    );
  }, [offers, debouncedQuery, typeFilter, sortKey]);

  const active = useMemo(
    () => (activeId ? (offers.find((o) => o.id === activeId) ?? null) : null),
    [activeId, offers],
  );

  const insights = useMemo(() => {
    const total = offers.length || 1;
    const dist = OFFER_TYPES.map((k) => {
      const count = offers.filter((o) => o.type === k).length;
      return {
        key: k,
        label: typeLabels[k],
        count,
        pct: Math.round((count / total) * 100),
        tone: k === "discount" ? "bg-primary" : k === "delivery" ? "bg-success" : "bg-brand",
      };
    });
    const withCode = offers.filter((o) => o.code).length;
    return {
      dist,
      total: offers.length,
      withCode,
      withCodePct: Math.round((withCode / total) * 100),
      typesUsed: new Set(offers.map((o) => o.type)).size,
    };
  }, [offers, typeLabels]);

  if (!restaurant) return null;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error(t("adminPromocoes.missingFieldsError"));
      return;
    }
    const input = {
      type,
      title: title.trim(),
      description: description.trim(),
      ...(code.trim() ? { code: code.trim() } : {}),
    };
    if (editing) {
      updateOffer(editing.id, input);
      toast.success(t("adminPromocoes.updatedToast"));
    } else {
      createOffer(restaurant.id, input);
      toast.success(t("adminPromocoes.createdToast"));
      promoHint.dismiss();
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    if (activeId === deleting.id) setActiveId(null);
    deleteOffer(deleting.id);
    toast.success(t("adminPromocoes.deletedToast"));
    setDeleting(null);
  };

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminPromocoes.eyebrow")}
        title={t("adminPromocoes.title")}
        action={
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="h-4 w-4" /> {t("adminPromocoes.newPromo")}
          </Button>
        }
      />

      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
        {offers.length === 0 ? (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <Tag className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("adminPromocoes.emptyText")}</p>
            <Button onClick={openCreate} className="rounded-xl">
              <Plus className="h-4 w-4" /> {t("adminPromocoes.createFirst")}
            </Button>
          </div>
        ) : (
          <>
            {/* Pesquisa + filtros */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 transition-colors focus-within:border-brand has-[:focus]:text-brand sm:max-w-xs">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("adminPromocoes.searchPlaceholder")}
                  className="w-full min-w-0 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                className={ADMIN_FILTER_SELECT}
              >
                <option value="todos">{t("adminPromocoes.filterTypeAll")}</option>
                {OFFER_TYPES.map((k) => (
                  <option key={k} value={k}>
                    {typeLabels[k]}
                  </option>
                ))}
              </select>

              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className={ADMIN_FILTER_SELECT}
              >
                <option value="tipo">{t("adminPromocoes.sortType")}</option>
                <option value="nome">{t("adminPromocoes.sortName")}</option>
              </select>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              {/* Lista */}
              <div className={`min-w-0 ${activeId ? "hidden lg:block" : "block"}`}>
                <p className="px-1 text-xs font-medium text-muted-foreground">
                  {t("adminPromocoes.resultsCount", { count: list.length })}
                </p>

                <div className="card-soft mt-2 overflow-hidden p-[5px]">
                  <div className="mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] gap-3 rounded-[20rem] bg-primary px-6 py-4 text-sm font-bold uppercase tracking-wide text-white">
                    <span>{t("adminPromocoes.colPromo")}</span>
                    <span className="text-right">{t("adminPromocoes.colCode")}</span>
                    <span className="pl-3 text-right">{t("adminPromocoes.colType")}</span>
                  </div>

                  <div>
                    {list.map((o, i) => {
                      const OfferIcon = iconByType[o.type];
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setActiveId(o.id)}
                          className={`mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[20rem] px-5 py-2.5 text-left transition-colors last:mb-0 ${
                            activeId === o.id
                              ? "bg-primary/10"
                              : i % 2 === 1
                                ? "bg-surface/70 hover:bg-primary/5"
                                : "hover:bg-primary/5"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                              <OfferIcon className="h-4 w-4" />
                            </span>
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {o.title}
                            </span>
                          </span>
                          <span className="text-right text-xs font-semibold text-foreground">
                            {o.code || "—"}
                          </span>
                          <span className="flex items-center gap-1 pl-3">
                            <span className="shrink-0 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand">
                              {typeLabels[o.type]}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </span>
                        </button>
                      );
                    })}
                    {list.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        {t("adminPromocoes.emptyNoResults")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Detalhe + ações */}
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
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                          {(() => {
                            const OfferIcon = iconByType[active.type];
                            return <OfferIcon className="h-5 w-5" />;
                          })()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                            {typeLabels[active.type]}
                          </p>
                          <h2 className="font-display text-lg font-bold text-primary">
                            {active.title}
                          </h2>
                        </div>
                      </div>

                      <p className="mt-4 rounded-lg bg-surface p-3 text-sm text-foreground">
                        {active.description}
                      </p>

                      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-4 text-sm">
                        <AdminField label={t("adminPromocoes.detailType")}>
                          {typeLabels[active.type]}
                        </AdminField>
                        <AdminField label={t("adminPromocoes.detailCode")}>
                          {active.code ? (
                            <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold">
                              {active.code}
                            </span>
                          ) : (
                            t("adminPromocoes.noCode")
                          )}
                        </AdminField>
                      </dl>

                      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(active);
                            setFormOpen(true);
                          }}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                        >
                          <Pencil className="h-3.5 w-3.5" /> {t("adminPromocoes.editAction")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(active)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-destructive/50 px-4 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t("adminPromocoes.deleteConfirm")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="grid place-items-center gap-3 py-12 text-center">
                      <Tag className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t("adminPromocoes.chooseHint")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <StatSection
              title={t("adminPromocoes.statsTitle")}
              hint={t("adminPromocoes.statsHint")}
            >
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <StatCard
                  wide
                  title={t("adminPromocoes.typeDistTitle")}
                  subtitle={t("adminPromocoes.resultsCount", { count: offers.length })}
                >
                  <StatBars rows={insights.dist} />
                </StatCard>

                <KpiTile
                  icon={Tag}
                  tone="primary"
                  label={t("adminPromocoes.kpiTotal")}
                  value={String(insights.total)}
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <KpiTile
                  icon={Percent}
                  tone="success"
                  label={t("adminPromocoes.kpiWithCode")}
                  value={String(insights.withCode)}
                  hint={t("adminPromocoes.kpiWithCodeHint", { pct: insights.withCodePct })}
                >
                  <MiniProgress pct={insights.withCodePct} />
                </KpiTile>
                <KpiTile
                  icon={Sparkles}
                  tone="muted"
                  big={false}
                  label={t("adminPromocoes.kpiTypes")}
                  value={`${insights.typesUsed} / 3`}
                  hint={t("adminPromocoes.kpiTypesHint")}
                />
              </div>
            </StatSection>
          </>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="font-display text-lg font-bold">
            {editing ? t("adminPromocoes.editDialogTitle") : t("adminPromocoes.newDialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("adminPromocoes.dialogDescription")}</DialogDescription>

          {!editing && promoHint.shouldShow && (
            <FirstUseHint text={t("adminPromocoes.firstUseHint")} onDismiss={promoHint.dismiss} />
          )}

          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="offer-type">{t("adminPromocoes.typeLabel")}</Label>
              <Select value={type} onValueChange={(v) => setType(v as Offer["type"])}>
                <SelectTrigger id="offer-type" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">{t("adminPromocoes.typeDiscount")}</SelectItem>
                  <SelectItem value="delivery">{t("adminPromocoes.typeDelivery")}</SelectItem>
                  <SelectItem value="happy-hour">{t("adminPromocoes.typeHappyHour")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offer-title">{t("adminPromocoes.titleLabel")}</Label>
              <Input
                id="offer-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("adminPromocoes.titlePlaceholder")}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offer-description">{t("adminPromocoes.descriptionLabel")}</Label>
              <Textarea
                id="offer-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("adminPromocoes.descriptionPlaceholder")}
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="offer-code">{t("adminPromocoes.codeLabel")}</Label>
              <Input
                id="offer-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t("adminPromocoes.codePlaceholder")}
              />
            </div>

            <Button type="submit" className="w-full rounded-xl">
              {editing ? t("adminPromocoes.saveChanges") : t("adminPromocoes.createPromo")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("adminPromocoes.deleteDialogTitle", { title: deleting?.title ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminPromocoes.deleteDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("adminPromocoes.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
