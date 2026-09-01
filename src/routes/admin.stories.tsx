import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr as frLocale, ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ImageIcon, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ADMIN_FILTER_SELECT,
  AdminField,
  KpiTile,
  StatBars,
  StatCard,
  StatSection,
  TrendArea,
  TrendBadge,
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
import { FirstUseHint } from "@/components/first-use-hint";
import { ImageUploadField } from "@/components/image-upload-field";
import type { RestaurantStory } from "@/data/types";
import { useTranslation } from "@/i18n";
import { useFirstUseHint } from "@/lib/first-use-hints";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useStoriesAdmin } from "@/lib/stories-admin";
import { BCP47, last8Weeks, weekStart } from "@/lib/week";

export const Route = createFileRoute("/admin/stories")({
  head: () => ({ meta: [{ title: "Stories — Painel Kino.com" }] }),
  component: () => (
    <RestaurantGate>
      <AdminStories />
    </RestaurantGate>
  ),
});

const dateLocales = { pt: ptBR, en: enUS, fr: frLocale };
type PeriodFilter = "todos" | "7" | "30";
type SortKey = "recent" | "old";

function AdminStories() {
  const { restaurant } = useRestaurantAdmin();
  const { storiesByRestaurant, createStory, deleteStory } = useStoriesAdmin();
  const { t, locale } = useTranslation();
  const storyHint = useFirstUseHint("story");

  const [formOpen, setFormOpen] = useState(false);
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<RestaurantStory | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("todos");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [activeId, setActiveId] = useState<string | null>(null);

  const stories = useMemo(
    () =>
      restaurant
        ? [...storiesByRestaurant(restaurant.id)].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
        : [],
    [restaurant, storiesByRestaurant],
  );

  const list = useMemo(() => {
    const now = Date.now();
    const rows = stories.filter((s) => {
      if (period === "todos") return true;
      const ageDays = (now - new Date(s.createdAt).getTime()) / 86_400_000;
      return ageDays <= Number(period);
    });
    return sortKey === "old" ? [...rows].reverse() : rows;
  }, [stories, period, sortKey]);

  const active = useMemo(
    () => (activeId ? (stories.find((s) => s.id === activeId) ?? null) : null),
    [activeId, stories],
  );

  const insights = useMemo(() => {
    const weeks = last8Weeks().map((start) => ({ start, count: 0 }));
    const byWeek = new Map(weeks.map((w) => [w.start.getTime(), w]));
    for (const s of stories) {
      const w = byWeek.get(weekStart(new Date(s.createdAt)).getTime());
      if (w) w.count += 1;
    }
    const prev = weeks[5]?.count ?? 0;
    const weekDelta = prev > 0 ? Math.round((((weeks[6]?.count ?? 0) - prev) / prev) * 100) : null;

    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString(BCP47[locale], { month: "short" }),
        count: 0,
      };
    });
    const monthIndex = new Map(months.map((m) => [m.key, m]));
    for (const s of stories) {
      const d = new Date(s.createdAt);
      const m = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.count += 1;
    }
    const maxMonth = Math.max(1, ...months.map((m) => m.count));
    const monthAgo = now.getTime() - 30 * 86_400_000;
    return {
      points: weeks.map((w) => ({
        label: w.start.toLocaleDateString(BCP47[locale], { day: "2-digit", month: "short" }),
        a: w.count,
      })),
      weekDelta,
      months: months.map((m) => ({
        key: m.key,
        label: m.label,
        count: m.count,
        pct: Math.round((m.count / maxMonth) * 100),
        tone: "bg-primary",
      })),
      total: stories.length,
      last30: stories.filter((s) => new Date(s.createdAt).getTime() >= monthAgo).length,
      lastAt: stories[0]?.createdAt ?? null,
    };
  }, [stories, locale]);

  if (!restaurant) return null;

  const rel = (iso: string) =>
    formatDistanceToNow(new Date(iso), { addSuffix: true, locale: dateLocales[locale] });
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(BCP47[locale], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image.trim()) {
      toast.error(t("adminStories.missingImageError"));
      return;
    }
    const { ok } = createStory(restaurant.id, image.trim());
    if (!ok) {
      toast.error(t("adminStories.saveFailedError"));
      return;
    }
    toast.success(t("adminStories.createdToast"));
    storyHint.dismiss();
    setImage("");
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    if (activeId === deleting.id) setActiveId(null);
    deleteStory(deleting.id);
    toast.success(t("adminStories.deletedToast"));
    setDeleting(null);
  };

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminStories.eyebrow")}
        title={t("adminStories.title")}
        action={
          <Button
            onClick={() => {
              setImage("");
              setFormOpen(true);
            }}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4" /> {t("adminStories.newStory")}
          </Button>
        }
      />

      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
        {stories.length === 0 ? (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("adminStories.emptyText")}</p>
            <Button onClick={() => setFormOpen(true)} className="rounded-xl">
              <Plus className="h-4 w-4" /> {t("adminStories.publishFirst")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                className={ADMIN_FILTER_SELECT}
              >
                <option value="todos">{t("adminStories.periodAll")}</option>
                <option value="7">{t("adminStories.period7")}</option>
                <option value="30">{t("adminStories.period30")}</option>
              </select>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className={ADMIN_FILTER_SELECT}
              >
                <option value="recent">{t("adminStories.sortRecent")}</option>
                <option value="old">{t("adminStories.sortOldest")}</option>
              </select>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              {/* Lista */}
              <div className={`min-w-0 ${activeId ? "hidden lg:block" : "block"}`}>
                <p className="px-1 text-xs font-medium text-muted-foreground">
                  {t("adminStories.resultsCount", { count: list.length })}
                </p>

                <div className="card-soft mt-2 overflow-hidden p-[5px]">
                  <div className="mb-[5px] grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-3 rounded-[20rem] bg-primary px-6 py-4 text-sm font-bold uppercase tracking-wide text-white">
                    <span className="w-10" />
                    <span>{t("adminStories.colPublished")}</span>
                    <span className="w-4" />
                  </div>

                  <div>
                    {list.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveId(s.id)}
                        className={`mb-[5px] grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[20rem] px-5 py-2.5 text-left transition-colors last:mb-0 ${
                          activeId === s.id
                            ? "bg-primary/10"
                            : i % 2 === 1
                              ? "bg-surface/70 hover:bg-primary/5"
                              : "hover:bg-primary/5"
                        }`}
                      >
                        <img
                          src={s.image}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg bg-surface object-cover"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold capitalize text-foreground">
                            {rel(s.createdAt)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {fmtDate(s.createdAt)}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                    {list.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        {t("adminStories.emptyNoResults")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Detalhe */}
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

                      <img
                        src={active.image}
                        alt=""
                        className="mx-auto max-h-[55vh] w-full rounded-2xl bg-surface object-contain"
                      />

                      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-5 text-sm">
                        <AdminField label={t("adminStories.detailPublished")}>
                          <span className="capitalize">{rel(active.createdAt)}</span>
                          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                            {fmtDate(active.createdAt)}
                          </span>
                        </AdminField>
                        <AdminField label={t("adminStories.detailVisibility")}>
                          {t("adminStories.visibilityValue")}
                        </AdminField>
                      </dl>

                      <div className="mt-5 border-t border-border pt-5">
                        <button
                          type="button"
                          onClick={() => setDeleting(active)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-destructive/50 px-4 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t("adminStories.deleteConfirm")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="grid place-items-center gap-3 py-12 text-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t("adminStories.chooseHint")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <StatSection title={t("adminStories.statsTitle")} hint={t("adminStories.statsHint")}>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <StatCard
                  wide
                  title={t("adminStories.chartWeeklyTitle")}
                  subtitle={t("adminStories.chartWeeklySubtitle")}
                  right={
                    <TrendBadge delta={insights.weekDelta} label={t("adminStories.vsPrevWeek")} />
                  }
                >
                  <TrendArea points={insights.points} legendA={t("adminStories.legendPublished")} />
                </StatCard>

                <StatCard
                  title={t("adminStories.monthlyTitle")}
                  subtitle={t("adminStories.monthlySubtitle")}
                >
                  <StatBars rows={insights.months} />
                </StatCard>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <KpiTile
                  icon={Sparkles}
                  tone="primary"
                  label={t("adminStories.kpiTotal")}
                  value={String(insights.total)}
                />
                <KpiTile
                  icon={ImageIcon}
                  tone="success"
                  label={t("adminStories.kpiLast30")}
                  value={String(insights.last30)}
                  hint={t("adminStories.kpiLast30Hint")}
                />
                <KpiTile
                  icon={ChevronRight}
                  tone="muted"
                  big={false}
                  label={t("adminStories.kpiLast")}
                  value={insights.lastAt ? rel(insights.lastAt) : "—"}
                />
              </div>
            </StatSection>
          </>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="font-display text-lg font-bold">
            {t("adminStories.newStoryDialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("adminStories.newStoryDialogDescription")}</DialogDescription>
          {storyHint.shouldShow && (
            <FirstUseHint text={t("adminStories.firstUseHint")} onDismiss={storyHint.dismiss} />
          )}
          <form onSubmit={handleCreate} className="mt-2 space-y-4">
            <ImageUploadField
              value={image}
              onChange={setImage}
              onUploadingChange={setUploading}
              label={t("adminStories.imageLabel")}
              helpText={t("adminStories.imageHelp")}
            />
            <Button type="submit" disabled={uploading} className="w-full rounded-xl">
              {t("adminStories.publish")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminStories.deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminStories.deleteDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("adminStories.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
