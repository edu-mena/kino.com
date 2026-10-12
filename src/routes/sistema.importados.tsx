import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  DownloadCloud,
  ExternalLink,
  ImageIcon,
  Loader2,
  LogIn,
  Mail,
  MapPin,
  Phone,
  Rocket,
  RotateCcw,
  Search,
  Trash2,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ADMIN_FILTER_SELECT } from "@/components/admin-stats";
import { SystemPageHeading } from "@/components/system-shell";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  activateImportedRestaurant,
  discardImportedRestaurant,
  fetchImportedRestaurant,
  fetchImportedRestaurants,
  restoreImportedRestaurant,
  type ImportStatus,
  type ImportedRestaurant,
} from "@/data/api-imported-restaurants";
import { useTranslation } from "@/i18n";
import { ApiError, hasRealBackend } from "@/lib/api-client";
import { formatKz } from "@/lib/format";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";
import { useSystemAdmin } from "@/lib/system-admin";
import { cn } from "@/lib/utils";
import { BCP47 } from "@/lib/week";

export const Route = createFileRoute("/sistema/importados")({
  head: () => ({ meta: [{ title: "Importados — Sistema Luku.com" }] }),
  component: SistemaImportados,
});

const STATUSES: ImportStatus[] = ["pending", "active", "discarded"];
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/**
 * /sistema/importados — restaurantes trazidos do menus.ao
 * (`php artisan menus-ao:import`), invisíveis ao público até serem
 * ativados aqui. Ver o cardápio, ativar (público + conta do dono com
 * convite por email + período grátis) ou descartar.
 */
function SistemaImportados() {
  const { t, locale } = useTranslation();
  const { token } = useSystemAdmin();
  const { enterAsOperator } = useRestaurantAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ImportStatus>("pending");
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("todas");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const listQuery = useQuery({
    queryKey: ["imported-restaurants", status],
    queryFn: () => fetchImportedRestaurants(status, token!),
    enabled: hasRealBackend && !!token,
  });
  const rows = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  const counts = listQuery.data?.counts;

  const provinces = useMemo(
    () => Array.from(new Set(rows.map((r) => r.province).filter(Boolean))).sort() as string[],
    [rows],
  );
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (province === "todas" || r.province === province) &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          (r.address ?? "").toLowerCase().includes(q) ||
          (r.cuisine ?? "").toLowerCase().includes(q)),
    );
  }, [rows, query, province]);
  const active = list.find((r) => r.id === activeId) ?? null;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["imported-restaurants"] });
  };

  const discard = async () => {
    if (!active || !token) return;
    setBusy(true);
    try {
      await discardImportedRestaurant(active.id, token);
      toast.success(t("sistema.importados.discardedToast", { name: active.name }));
      setActiveId(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("sistema.importados.errorToast"));
    } finally {
      setBusy(false);
      setDiscardOpen(false);
    }
  };

  const restore = async (row: ImportedRestaurant) => {
    if (!token) return;
    setBusy(true);
    try {
      await restoreImportedRestaurant(row.id, token);
      toast.success(t("sistema.importados.restoredToast", { name: row.name }));
      setActiveId(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("sistema.importados.errorToast"));
    } finally {
      setBusy(false);
    }
  };

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(BCP47[locale], {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  if (!hasRealBackend) {
    return (
      <div className="pb-16">
        <SystemPageHeading
          eyebrow={t("sistema.importados.eyebrow")}
          title={t("sistema.importados.title")}
        />
        <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
          <div className="card-soft p-10 text-center text-sm text-muted-foreground">
            {t("sistema.importados.demoOnly")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <SystemPageHeading
        eyebrow={t("sistema.importados.eyebrow")}
        title={t("sistema.importados.title")}
        description={t("sistema.importados.description")}
      />

      <div className="mx-auto mt-6 max-w-6xl px-4 md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-border bg-card p-1 text-xs font-semibold">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  setActiveId(null);
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 transition-colors",
                  status === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`sistema.importados.status.${s}`)}
                {counts ? ` (${counts[s]})` : ""}
              </button>
            ))}
          </div>
          <label className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("sistema.importados.searchPlaceholder")}
              className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </label>
          {provinces.length > 1 && (
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className={ADMIN_FILTER_SELECT}
            >
              <option value="todas">{t("sistema.importados.allProvinces")}</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Lista */}
          <div className={`min-w-0 ${activeId ? "hidden lg:block" : "block"}`}>
            <p className="px-1 text-xs font-medium text-muted-foreground">
              {t("sistema.importados.resultsCount", { count: list.length })}
            </p>
            <div className="card-soft mt-2 overflow-hidden p-[5px]">
              <div className="mb-[5px] grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[20rem] bg-primary px-6 py-4 text-sm font-bold uppercase tracking-wide text-white">
                <span>{t("sistema.importados.colRestaurant")}</span>
                <span className="text-right">{t("sistema.importados.colMenu")}</span>
              </div>
              {listQuery.isLoading && (
                <p className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
                </p>
              )}
              {list.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveId(r.id)}
                  className={cn(
                    "mb-[5px] grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[20rem] px-3 py-2.5 text-left transition-colors last:mb-0",
                    activeId === r.id
                      ? "bg-primary/10"
                      : i % 2 === 1
                        ? "bg-surface/70 hover:bg-primary/5"
                        : "hover:bg-primary/5",
                  )}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-border">
                    {r.logoUrl ? (
                      <img src={r.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
                    ) : r.coverImageUrl ? (
                      <img src={r.coverImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Utensils className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {r.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {[r.cuisine, r.address ?? r.province].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 pl-2 text-xs font-semibold text-foreground">
                    {t("sistema.importados.dishesShort", { count: r.itemCount })}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </span>
                </button>
              ))}
              {!listQuery.isLoading && list.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <DownloadCloud className="mx-auto mb-2 h-8 w-8" />
                  {status === "pending" && rows.length === 0
                    ? t("sistema.importados.emptyPending")
                    : t("sistema.importados.empty")}
                </div>
              )}
            </div>
          </div>

          {/* Detalhe */}
          <div className={`min-w-0 ${activeId ? "block" : "hidden lg:block"}`}>
            <div className="card-soft sticky top-24 overflow-hidden p-0 lg:top-6">
              {active ? (
                <>
                  <div className="relative h-36 bg-gradient-to-br from-primary to-primary/70">
                    {active.coverImageUrl && (
                      <img
                        src={active.coverImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                    <button
                      type="button"
                      onClick={() => setActiveId(null)}
                      className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-foreground lg:hidden"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> {t("common.back")}
                    </button>
                    <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
                      {active.logoUrl && (
                        <img
                          src={active.logoUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-1"
                        />
                      )}
                      <div className="min-w-0">
                        <h2 className="truncate font-display text-lg font-extrabold text-white">
                          {active.name}
                        </h2>
                        <p className="truncate text-xs text-white/90">
                          {[active.cuisine, active.province].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <Stat
                        icon={Utensils}
                        value={active.itemCount}
                        label={t("sistema.importados.statDishes")}
                      />
                      <Stat
                        icon={BookOpen}
                        value={active.stats.categories ?? 0}
                        label={t("sistema.importados.statCategories")}
                      />
                      <Stat
                        icon={ImageIcon}
                        value={active.stats.images ?? 0}
                        label={t("sistema.importados.statPhotos")}
                      />
                    </div>

                    <ul className="space-y-2 text-sm">
                      {active.address && (
                        <li className="flex items-start gap-2 text-foreground">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          {active.address}
                        </li>
                      )}
                      <li className="flex items-center gap-2 text-foreground">
                        <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {active.contactPhone ? (
                          <a
                            href={`tel:${active.contactPhone.replace(/\s/g, "")}`}
                            className="hover:underline"
                          >
                            {active.contactPhone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {active.contactEmail ? (
                          <a
                            href={`mailto:${active.contactEmail}`}
                            className="truncate hover:underline"
                          >
                            {active.contactEmail}
                          </a>
                        ) : (
                          "—"
                        )}
                      </li>
                    </ul>
                    <p className="rounded-xl bg-surface p-3 text-[11px] text-muted-foreground">
                      {t("sistema.importados.privateContactsHint")}
                    </p>

                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <dt className="text-muted-foreground">{t("sistema.importados.syncedAt")}</dt>
                      <dd className="text-right font-semibold text-foreground">
                        {fmtDate(active.syncedAt)}
                      </dd>
                      {active.activatedAt && (
                        <>
                          <dt className="text-muted-foreground">
                            {t("sistema.importados.activatedAt")}
                          </dt>
                          <dd className="text-right font-semibold text-foreground">
                            {fmtDate(active.activatedAt)}
                          </dd>
                        </>
                      )}
                      {(active.stats.skippedNoPrice ?? 0) > 0 && (
                        <>
                          <dt className="text-muted-foreground">
                            {t("sistema.importados.skippedNoPrice")}
                          </dt>
                          <dd className="text-right font-semibold text-foreground">
                            {active.stats.skippedNoPrice}
                          </dd>
                        </>
                      )}
                    </dl>

                    <div className="grid gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setPreviewOpen(true)}
                      >
                        <BookOpen className="h-4 w-4" /> {t("sistema.importados.preview")}
                      </Button>
                      {status === "pending" && (
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <Button
                            type="button"
                            className="rounded-full"
                            onClick={() => setActivateOpen(true)}
                          >
                            <Rocket className="h-4 w-4" /> {t("sistema.importados.activate")}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="rounded-full text-muted-foreground hover:text-destructive"
                            aria-label={t("sistema.importados.discard")}
                            onClick={() => setDiscardOpen(true)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {status === "active" && (
                        <Button
                          type="button"
                          className="rounded-full"
                          onClick={() => {
                            if (!token) return;
                            enterAsOperator(active.id, token);
                            navigate({ to: "/admin" });
                          }}
                        >
                          <LogIn className="h-4 w-4" /> {t("sistema.importados.enterPanel")}
                        </Button>
                      )}
                      {status === "discarded" && (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full"
                          disabled={busy}
                          onClick={() => void restore(active)}
                        >
                          <RotateCcw className="h-4 w-4" /> {t("sistema.importados.restore")}
                        </Button>
                      )}
                      <a
                        href={active.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> {t("sistema.importados.source")}
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid place-items-center gap-2 p-12 text-center text-sm text-muted-foreground">
                  <DownloadCloud className="h-8 w-8" />
                  {t("sistema.importados.chooseHint")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {active && (
        <MenuPreviewDialog
          key={`preview-${active.id}`}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          restaurantId={active.id}
          token={token}
          weekdayLabel={(d) => t(`sistema.importados.weekday.${WEEKDAY_KEYS[d]}`)}
        />
      )}

      {active && (
        <ActivateDialog
          key={`activate-${active.id}`}
          open={activateOpen}
          onOpenChange={setActivateOpen}
          restaurant={active}
          onActivated={async () => {
            setActivateOpen(false);
            setActiveId(null);
            await refresh();
            await queryClient.invalidateQueries({ queryKey: ["restaurants"] });
          }}
        />
      )}

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent className="rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("sistema.importados.discardTitle", { name: active?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("sistema.importados.discardDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void discard()} disabled={busy}>
              {t("sistema.importados.discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Utensils;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-surface p-2.5">
      <Icon className="mx-auto h-4 w-4 text-brand" />
      <p className="mt-1 font-display text-lg font-extrabold text-primary">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

/** O cardápio importado tal como vai ficar na Luku — fotos, descrições e
 * preços por categoria, com o horário lido. */
function MenuPreviewDialog({
  open,
  onOpenChange,
  restaurantId,
  token,
  weekdayLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  token: string | null;
  weekdayLabel: (weekday: number) => string;
}) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["imported-restaurant", restaurantId],
    queryFn: () => fetchImportedRestaurant(restaurantId, token!),
    enabled: open && !!token,
  });
  const data = detail.data;
  const categories = data?.categories ?? [];
  const shown = category ? categories.filter((c) => c.name === category) : categories;
  const closedDays = (data?.hours ?? [])
    .filter((h) => !h.isOpen)
    .map((h) => weekdayLabel(h.weekday));
  const range = data?.hours.find((h) => h.isOpen)?.ranges[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setCategory(null);
      }}
    >
      <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col gap-0 overflow-hidden rounded-[1.5rem] border-none bg-card p-0">
        <div className="relative h-32 shrink-0 bg-gradient-to-br from-primary to-primary/70">
          {data?.coverImageUrl && (
            <img src={data.coverImageUrl} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
            {data?.logoUrl && (
              <img
                src={data.logoUrl}
                alt=""
                className="h-12 w-12 rounded-xl bg-white object-contain p-1"
              />
            )}
            <div className="min-w-0 text-white">
              <DialogTitle className="truncate font-display text-lg font-extrabold">
                {data?.name ?? t("common.loading")}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap gap-x-3 text-xs text-white/85">
                {range && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {range.start}–{range.end}
                    {closedDays.length > 0 &&
                      ` · ${t("sistema.importados.closedOn", { days: closedDays.join(", ") })}`}
                  </span>
                )}
                {data?.address && <span>{data.address}</span>}
              </DialogDescription>
            </div>
          </div>
        </div>

        {categories.length > 1 && (
          <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border px-4 py-3">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold",
                category === null
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {t("sistema.importados.allCategories")}
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setCategory(c.name)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold",
                  category === c.name
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {c.name} ({c.items.length})
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {detail.isLoading && (
            <p className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
            </p>
          )}
          {shown.map((c) => (
            <section key={c.name} className="pt-5">
              <h3 className="mb-2 font-display text-base font-extrabold text-primary">{c.name}</h3>
              <ul className="divide-y divide-border">
                {c.items.map((item) => (
                  <li key={item.id} className="flex gap-3 py-3">
                    <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Utensils className="h-5 w-5 text-muted-foreground" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="shrink-0 text-sm font-bold text-primary">
                          {formatKz(item.price)}
                        </p>
                      </div>
                      {item.description && (
                        <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      {item.ingredients && item.ingredients.length > 0 && (
                        <div
                          className="mt-1.5 flex flex-wrap gap-1"
                          aria-label={t("sistema.importados.ingredients")}
                        >
                          {item.ingredients.map((name) => (
                            <span
                              key={name}
                              className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActivateDialog({
  open,
  onOpenChange,
  restaurant,
  onActivated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: ImportedRestaurant;
  onActivated: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const { token } = useSystemAdmin();
  const { enterAsOperator } = useRestaurantAdmin();
  const navigate = useNavigate();
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState(restaurant.contactEmail ?? "");
  const [ownerPhone, setOwnerPhone] = useState(restaurant.contactPhone ?? "");
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await activateImportedRestaurant(
        restaurant.id,
        {
          ownerName: ownerName.trim(),
          ownerEmail: ownerEmail.trim(),
          ...(ownerPhone.trim() ? { ownerPhone: ownerPhone.trim() } : {}),
          ...(showPhone && ownerPhone.trim() ? { publicPhone: ownerPhone.trim() } : {}),
          ...(showEmail && ownerEmail.trim() ? { publicEmail: ownerEmail.trim() } : {}),
        },
        token,
      );
      toast.success(
        t("sistema.importados.activatedToast", { name: restaurant.name, email: ownerEmail.trim() }),
        {
          action: {
            label: t("sistema.importados.enterPanel"),
            onClick: () => {
              enterAsOperator(restaurant.id, token);
              navigate({ to: "/admin" });
            },
          },
        },
      );
      await onActivated();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("sistema.importados.errorToast"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[1.5rem] border-none bg-card p-6">
        <DialogTitle className="font-display text-lg font-bold">
          {t("sistema.importados.activateTitle", { name: restaurant.name })}
        </DialogTitle>
        <DialogDescription>{t("sistema.importados.activateHint")}</DialogDescription>
        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="act-name">{t("sistema.importados.ownerName")}</Label>
            <Input
              id="act-name"
              required
              maxLength={150}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="act-email">{t("sistema.importados.ownerEmail")}</Label>
            <Input
              id="act-email"
              type="email"
              required
              maxLength={190}
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("sistema.importados.ownerEmailHint")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="act-phone">{t("sistema.importados.ownerPhone")}</Label>
            <Input
              id="act-phone"
              maxLength={30}
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2 rounded-xl border border-border p-3">
            <p className="text-xs font-semibold text-foreground">
              {t("sistema.importados.publicContactsTitle")}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={showPhone}
                onCheckedChange={(v) => setShowPhone(v === true)}
                disabled={!ownerPhone.trim()}
              />
              {t("sistema.importados.showPhone")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={showEmail} onCheckedChange={(v) => setShowEmail(v === true)} />
              {t("sistema.importados.showEmail")}
            </label>
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {t("sistema.importados.activateConfirm")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
