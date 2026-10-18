import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, MapPin, Store, Trash2, UtensilsCrossed } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { KpiTile } from "@/components/admin-stats";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  deleteSeededRestaurants,
  fetchSeededRestaurants,
  setSeededRestaurantsActive,
  type SeededRestaurant,
  type SeededSelection,
} from "@/data/api-seeded-restaurants";
import { useTranslation } from "@/i18n";
import { useSystemAdmin } from "@/lib/system-admin";

export const Route = createFileRoute("/sistema/gerados")({
  head: () => ({ meta: [{ title: "Restaurantes gerados — Sistema Luku.com" }] }),
  component: SistemaGerados,
});

/** Restaurantes criados em lote (`restaurants:seed-demo`): desativar,
 * reativar e apagar de vez — um a um, os selecionados ou o lote todo. */
function SistemaGerados() {
  const { t } = useTranslation();
  const { token } = useSystemAdmin();
  const [rows, setRows] = useState<SeededRestaurant[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [province, setProvince] = useState("all");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SeededSelection | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    fetchSeededRestaurants(token)
      .then((data) => {
        setRows(data);
        setSelected(new Set());
      })
      .catch(() => toast.error(t("sistemaGerados.loadError")));
  }, [token, t]);

  useEffect(load, [load]);

  const provinces = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows ?? [])
      counts.set(r.province ?? "—", (counts.get(r.province ?? "—") ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const visible = (rows ?? []).filter((r) => province === "all" || r.province === province);
  const active = (rows ?? []).filter((r) => r.active).length;
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(visible.map((r) => r.id)));

  const selection = (): SeededSelection | null =>
    selected.size > 0 ? { ids: [...selected] } : null;

  const run = async (fn: () => Promise<number>, okKey: string) => {
    if (!token) return;
    setBusy(true);
    try {
      const n = await fn();
      toast.success(t(okKey, { count: n }));
      load();
    } catch {
      toast.error(t("sistemaGerados.actionError"));
    } finally {
      setBusy(false);
    }
  };

  const setActive = (sel: SeededSelection | null, value: boolean) => {
    if (!sel || !token) return;
    void run(
      () => setSeededRestaurantsActive(sel, value, token),
      value ? "sistemaGerados.activatedToast" : "sistemaGerados.deactivatedToast",
    );
  };

  const doDelete = () => {
    const sel = confirmDelete;
    setConfirmDelete(null);
    if (!sel || !token) return;
    void run(() => deleteSeededRestaurants(sel, token), "sistemaGerados.deletedToast");
  };

  const deleteCount =
    confirmDelete && "all" in confirmDelete
      ? (rows?.length ?? 0)
      : (confirmDelete?.ids.length ?? 0);

  const modeLabel = (r: SeededRestaurant) =>
    [
      ...r.modes.map((m) => t(`sistemaGerados.modes.${m}`)),
      ...(r.acceptsReservations ? [t("sistemaGerados.modes.reservations")] : []),
    ].join(" · ");

  return (
    <div className="pb-16">
      <SystemPageHeading
        eyebrow={t("sistemaGerados.eyebrow")}
        title={t("sistemaGerados.title")}
        description={t("sistemaGerados.description")}
      />

      <div className="mx-auto mt-6 max-w-5xl space-y-6 px-4 md:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiTile
            icon={Store}
            tone="brand"
            big={false}
            label={t("sistemaGerados.total")}
            value={String(rows?.length ?? 0)}
            hint={t("sistemaGerados.totalHint")}
          />
          <KpiTile
            icon={Eye}
            tone="success"
            big={false}
            label={t("sistemaGerados.active")}
            value={String(active)}
            hint={t("sistemaGerados.activeHint")}
          />
          <KpiTile
            icon={MapPin}
            tone="primary"
            big={false}
            label={t("sistemaGerados.provinces")}
            value={String(provinces.length)}
            hint={provinces[0] ? `${provinces[0][0]}: ${provinces[0][1]}` : "—"}
          />
        </div>

        <p className="rounded-2xl bg-surface p-4 text-sm text-muted-foreground">
          {t("sistemaGerados.accessNote")}
        </p>

        {/* Ações do lote */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
            aria-label={t("sistemaGerados.filterProvince")}
          >
            <option value="all">{t("sistemaGerados.allProvinces")}</option>
            {provinces.map(([p, n]) => (
              <option key={p} value={p}>
                {p} ({n})
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {t("sistemaGerados.selected", { count: selected.size })}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <ActionButton
              icon={EyeOff}
              disabled={busy || selected.size === 0}
              onClick={() => setActive(selection(), false)}
            >
              {t("sistemaGerados.deactivate")}
            </ActionButton>
            <ActionButton
              icon={Eye}
              disabled={busy || selected.size === 0}
              onClick={() => setActive(selection(), true)}
            >
              {t("sistemaGerados.activate")}
            </ActionButton>
            <ActionButton
              icon={Trash2}
              danger
              disabled={busy || selected.size === 0}
              onClick={() => setConfirmDelete(selection())}
            >
              {t("sistemaGerados.delete")}
            </ActionButton>
          </div>
        </div>

        {/* Lista */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <label className="flex items-center gap-3 border-b border-border p-3 text-sm font-semibold">
            <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} />
            {t("sistemaGerados.selectAll")}
          </label>
          {rows === null ? (
            <p className="p-4 text-sm text-muted-foreground">{t("sistemaGerados.loading")}</p>
          ) : visible.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t("sistemaGerados.empty")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((r) => (
                <li key={r.id} className="flex items-start gap-3 p-3">
                  <Checkbox
                    className="mt-1"
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggle(r.id)}
                    aria-label={r.name}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{r.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          r.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {r.active
                          ? t("sistemaGerados.statusActive")
                          : t("sistemaGerados.statusInactive")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.cuisine} · {r.neighborhood}, {r.province}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <UtensilsCrossed className="h-3 w-3" aria-hidden />
                        {t("sistemaGerados.items", { count: r.menuItems })}
                      </span>
                      <span>{modeLabel(r)}</span>
                    </p>
                    {r.ownerEmail && (
                      <p className="mt-1 break-all font-mono text-xs text-primary">
                        {r.ownerEmail}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Lote inteiro */}
        {rows && rows.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <ActionButton
              icon={EyeOff}
              disabled={busy}
              onClick={() => setActive({ all: true }, false)}
            >
              {t("sistemaGerados.deactivateAll")}
            </ActionButton>
            <ActionButton icon={Eye} disabled={busy} onClick={() => setActive({ all: true }, true)}>
              {t("sistemaGerados.activateAll")}
            </ActionButton>
            <ActionButton
              icon={Trash2}
              danger
              disabled={busy}
              onClick={() => setConfirmDelete({ all: true })}
            >
              {t("sistemaGerados.deleteAll")}
            </ActionButton>
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("sistemaGerados.confirmTitle", { count: deleteCount })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("sistemaGerados.confirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("sistemaGerados.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("sistemaGerados.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  danger = false,
  disabled,
  onClick,
  children,
}: {
  icon: typeof Eye;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
        danger
          ? "border-destructive/40 text-destructive hover:bg-destructive/5"
          : "border-border hover:bg-surface"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {children}
    </button>
  );
}
