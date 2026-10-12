import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  ImagePlus,
  Lightbulb,
  Loader2,
  Palette,
  Printer,
  QrCode,
  ScanLine,
  Store,
  Trash2,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import lukuLogo from "@/assets/logo.png";
import { QrCard, type QrCardData, type QrCardLabels } from "@/components/qr/qr-card";
import { QrPrintSheets, exportQrCardPng, qrFileName, sheetCount } from "@/components/qr/qr-print";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateApiRestaurant } from "@/data/api-restaurants";
import { saveProfileEdits } from "@/data/restaurant-profile-store";
import type { RestaurantTable } from "@/data/tables-store";
import type { Restaurant } from "@/data/types";
import { useTranslation } from "@/i18n";
import { hasRealBackend } from "@/lib/api-client";
import { uploadImageDataUrl } from "@/lib/api-upload";
import { fileToResizedDataUrl } from "@/lib/image-upload";
import {
  QR_COLOR_PRESETS,
  QR_FORMATS,
  QR_FORMAT_SIZE_MM,
  QR_SHEET_GRID,
  QR_TEMPLATES,
  type QrStyle,
} from "@/lib/qr-style";
import { getAdminToken } from "@/lib/restaurant-admin";
import { qrLink, useRestaurantQr } from "@/lib/use-restaurant-qr";
import { cn } from "@/lib/utils";

/** Id da seleção que representa o QR geral (sem mesa). */
export const GENERAL_QR = "__general__";

export function useQrCardLabels(): QrCardLabels {
  const { t } = useTranslation();
  return {
    table: t("adminMesas.qr.card.table"),
    headline: t("adminMesas.qr.card.headline"),
    general: t("adminMesas.qr.card.general"),
    steps: [
      t("adminMesas.qr.card.step1"),
      t("adminMesas.qr.card.step2"),
      t("adminMesas.qr.card.step3"),
    ],
    wifi: t("adminMesas.qr.card.wifi"),
    password: t("adminMesas.qr.card.password"),
    orderWith: t("adminMesas.qr.card.orderWith"),
  };
}

function Section({
  icon: Icon,
  title,
  children,
  aside,
}: {
  icon: typeof QrCode;
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="card-soft space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
          <Icon className="h-4 w-4 text-brand" /> {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <Label htmlFor={id} className={cn(disabled && "opacity-50")}>
          {label}
        </Label>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

/**
 * Estúdio de QR (`/admin/mesas`, separador "Códigos QR"): um QR por mesa
 * (o pedido "no local" já sai com a mesa) + o QR geral do restaurante,
 * impressos a partir da organização da sala. Modelo, formato, cor,
 * logótipo, número da mesa, Wi-Fi e selo Luku — pré-visualização ao vivo,
 * folhas A4 prontas a imprimir/guardar em PDF e PNG por cartão. O estilo
 * fica guardado no restaurante.
 */
export function QrStudio({
  restaurant,
  tables,
  focusTableId,
}: {
  restaurant: Restaurant;
  tables: RestaurantTable[];
  /** Vindo do botão QR de uma mesa na lista — começa só com ela. */
  focusTableId?: string | null;
}) {
  const { t } = useTranslation();
  const labels = useQrCardLabels();
  const queryClient = useQueryClient();
  const qr = useRestaurantQr(restaurant.id);
  const { style, setStyle } = qr;

  const activeTables = useMemo(() => tables.filter((tbl) => tbl.isActive !== false), [tables]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(activeTables.map((tbl) => tbl.id)),
  );
  const [previewIndex, setPreviewIndex] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Logótipo acabado de carregar, em data URL — o PNG não precisa de o ir
  // buscar ao armazenamento (que pode não permitir CORS).
  const [localLogo, setLocalLogo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = useRef(false);
  const seededSelection = useRef(false);

  // Mesas chegam depois do 1.º render (API) — seleção inicial = todas.
  useEffect(() => {
    if (seededSelection.current || activeTables.length === 0) return;
    seededSelection.current = true;
    setSelected(new Set(activeTables.map((tbl) => tbl.id)));
  }, [activeTables]);

  useEffect(() => {
    if (!focusTableId) return;
    seededSelection.current = true;
    setSelected(new Set([focusTableId]));
    setPreviewIndex(0);
  }, [focusTableId]);

  // Guarda o estilo 0,8 s depois da última mudança.
  useEffect(() => {
    if (!dirty.current) return;
    setSaveState("saving");
    const id = window.setTimeout(() => {
      void qr.saveStyle(style).then((ok) => setSaveState(ok ? "saved" : "error"));
    }, 800);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style]);

  const update = (patch: Partial<QrStyle>) => {
    dirty.current = true;
    setStyle((s) => ({ ...s, ...patch }));
  };

  const logo = localLogo ?? (restaurant.logo || undefined);

  const items = useMemo(() => {
    const list: (QrCardData & { key: string; code: string; scans: number })[] = [];
    if (selected.has(GENERAL_QR) && qr.code) {
      list.push({
        key: GENERAL_QR,
        code: qr.code,
        scans: qr.scans,
        url: qrLink(qr.code),
        restaurantName: restaurant.name,
        logo,
      });
    }
    for (const tbl of tables) {
      if (!selected.has(tbl.id) || !tbl.qr) continue;
      list.push({
        key: tbl.id,
        code: tbl.qr.code,
        scans: tbl.qr.scans,
        url: qrLink(tbl.qr.code),
        restaurantName: restaurant.name,
        logo,
        tableName: tbl.name,
      });
    }
    return list;
  }, [selected, tables, qr.code, qr.scans, restaurant.name, logo]);

  const previewItem = items[Math.min(previewIndex, Math.max(0, items.length - 1))];
  const sampleItem: QrCardData = previewItem ?? {
    url: qrLink(qr.code ?? "LUKU"),
    restaurantName: restaurant.name,
    logo,
    tableName: tables[0]?.name ?? "Mesa 1",
  };

  const areas = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const tbl of activeTables) {
      const area = tbl.area?.trim() || t("adminMesas.day.noArea");
      map.set(area, [...(map.get(area) ?? []), tbl.id]);
    }
    return [...map.entries()];
  }, [activeTables, t]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sheets = sheetCount(style, items.length);

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 600, "image/png");
      setLocalLogo(dataUrl);
      if (hasRealBackend) {
        const token = getAdminToken();
        if (!token) throw new Error("no_token");
        const url = await uploadImageDataUrl(dataUrl, "logo", token);
        await updateApiRestaurant(restaurant.id, { logo: url }, token);
        await queryClient.invalidateQueries({ queryKey: ["restaurant", restaurant.id] });
      } else {
        saveProfileEdits(restaurant.id, { logo: dataUrl });
      }
      if (!style.showLogo) update({ showLogo: true });
      toast.success(t("adminMesas.qr.logoSavedToast"));
    } catch {
      setLocalLogo(null);
      toast.error(t("adminMesas.qr.logoFailedToast"));
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    setLocalLogo(null);
    try {
      if (hasRealBackend) {
        const token = getAdminToken();
        if (!token) throw new Error("no_token");
        await updateApiRestaurant(restaurant.id, { logo: "" }, token);
        await queryClient.invalidateQueries({ queryKey: ["restaurant", restaurant.id] });
      } else {
        saveProfileEdits(restaurant.id, { logo: "" });
      }
    } catch {
      toast.error(t("adminMesas.qr.logoFailedToast"));
    }
  };

  const downloadPng = async () => {
    if (!previewItem) return;
    setExporting(true);
    try {
      const result = await exportQrCardPng({
        data: previewItem,
        style,
        labels,
        lukuLogo,
        filename: qrFileName(restaurant.name, previewItem.tableName),
      });
      if (result === "no-logo") toast.info(t("adminMesas.qr.pngNoLogo"));
    } catch {
      toast.error(t("adminMesas.qr.pngFailed"));
    } finally {
      setExporting(false);
    }
  };

  const copyLink = () => {
    if (!previewItem) return;
    navigator.clipboard?.writeText(previewItem.url).then(
      () => toast.success(t("menuQrDialog.linkCopiedToast")),
      () => toast.error(t("menuQrDialog.copyFailedToast")),
    );
  };

  const previewWidth: Record<QrStyle["format"], string> = {
    card: "max-w-[300px]",
    tent: "max-w-[520px]",
    sticker: "max-w-[280px]",
    mini: "max-w-[360px]",
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      {/* Pré-visualização (1.º no telemóvel, à direita e fixa no desktop) */}
      <div className="space-y-4 lg:sticky lg:top-24 lg:order-2">
        <div className="card-soft overflow-hidden p-0">
          <div className="grid place-items-center bg-[radial-gradient(circle_at_30%_20%,var(--surface),transparent_70%)] bg-surface/60 px-4 py-8">
            {qr.loaded && previewItem ? (
              <QrCard
                data={previewItem}
                style={style}
                labels={labels}
                lukuLogo={lukuLogo}
                className={cn("w-full drop-shadow-xl", previewWidth[style.format])}
              />
            ) : (
              <div className="grid h-64 place-items-center text-sm text-muted-foreground">
                {qr.loaded ? (
                  t("adminMesas.qr.nothingSelected")
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
              </div>
            )}
          </div>
          {items.length > 0 && (
            <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
              <button
                type="button"
                aria-label={t("adminMesas.qr.prev")}
                disabled={previewIndex <= 0}
                onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 text-center">
                <p className="truncate text-sm font-bold text-foreground">
                  {previewItem?.tableName ?? t("adminMesas.qr.generalName")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("adminMesas.qr.position", {
                    current: Math.min(previewIndex, items.length - 1) + 1,
                    total: items.length,
                  })}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("adminMesas.qr.next")}
                disabled={previewIndex >= items.length - 1}
                onClick={() => setPreviewIndex((i) => Math.min(items.length - 1, i + 1))}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {previewItem && (
          <div className="card-soft space-y-2 p-4">
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground">
                {previewItem.url.replace(/^https?:\/\//, "")}
              </code>
              <button
                type="button"
                aria-label={t("menuQrDialog.copyLink")}
                onClick={copyLink}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
              >
                <Copy className="h-4 w-4" />
              </button>
              <a
                href={`${previewItem.url}?preview=1`}
                target="_blank"
                rel="noreferrer"
                aria-label={t("adminMesas.qr.test")}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ScanLine className="h-3.5 w-3.5" />
              {t("adminMesas.qr.scans", { count: previewItem.scans })}
              {qr.totalScans > 0 && ` · ${t("adminMesas.qr.totalScans", { count: qr.totalScans })}`}
            </p>
          </div>
        )}

        <div className="card-soft space-y-3 p-4">
          <p className="text-sm font-semibold text-foreground">
            {t("adminMesas.qr.summary", { cards: items.length, sheets })}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              className="rounded-full"
              disabled={items.length === 0 || printing}
              onClick={() => setPrinting(true)}
            >
              {printing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              {t("adminMesas.qr.print")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={!previewItem || exporting}
              onClick={() => void downloadPng()}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("adminMesas.qr.png")}
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            {saveState === "saving"
              ? t("adminMesas.qr.saving")
              : saveState === "saved"
                ? t("adminMesas.qr.saved")
                : saveState === "error"
                  ? t("adminMesas.qr.saveError")
                  : t("adminMesas.qr.autoSave")}
          </p>
        </div>

        <div className="flex gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4 text-xs text-foreground">
          <Lightbulb className="h-4 w-4 shrink-0 text-brand" />
          <p>{t(`adminMesas.qr.tip.${style.format}`)}</p>
        </div>
      </div>

      {/* Opções */}
      <div className="space-y-4 lg:order-1">
        <Section
          icon={QrCode}
          title={t("adminMesas.qr.whatTitle")}
          aside={
            <span className="text-[11px] font-semibold text-muted-foreground">
              {t("adminMesas.qr.selectedCount", { count: items.length })}
            </span>
          }
        >
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                setSelected((prev) => {
                  const next = new Set(activeTables.map((tbl) => tbl.id));
                  if (prev.has(GENERAL_QR)) next.add(GENERAL_QR);
                  return next;
                })
              }
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {t("adminMesas.qr.allTables", { count: activeTables.length })}
            </button>
            {areas.length > 1 &&
              areas.map(([area, ids]) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setSelected(new Set(ids))}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {area} ({ids.length})
                </button>
              ))}
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
            >
              {t("adminMesas.qr.none")}
            </button>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/50">
            <input
              type="checkbox"
              checked={selected.has(GENERAL_QR)}
              onChange={() => toggle(GENERAL_QR)}
              className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
            />
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                {t("adminMesas.qr.generalName")}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {t("adminMesas.qr.generalHint")}
              </span>
            </span>
          </label>

          {tables.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("adminMesas.qr.noTables")}</p>
          ) : (
            <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
              {tables.map((tbl) => {
                const on = selected.has(tbl.id);
                const off = tbl.isActive === false;
                return (
                  <button
                    key={tbl.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(tbl.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition-colors",
                      on
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50",
                      off && "opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-4 w-4 shrink-0 place-items-center rounded border",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{tbl.name}</span>
                    {tbl.qr && tbl.qr.scans > 0 && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {tbl.qr.scans}×
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        <Section icon={Printer} title={t("adminMesas.qr.formatTitle")}>
          <div className="grid grid-cols-2 gap-2">
            {QR_FORMATS.map((f) => {
              const { w, h } = QR_FORMAT_SIZE_MM[f];
              const { cols, rows } = QR_SHEET_GRID[f];
              const ratio = w / h;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={style.format === f}
                  onClick={() => update({ format: f })}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    style.format === f
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center">
                    <span
                      className={cn(
                        "block border-2",
                        style.format === f
                          ? "border-primary bg-primary/10"
                          : "border-muted-foreground/40",
                        f === "sticker" ? "rounded-full" : "rounded-md",
                      )}
                      style={
                        ratio >= 1
                          ? { width: 40, height: 40 / ratio }
                          : { height: 40, width: 40 * ratio }
                      }
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {t(`adminMesas.qr.format.${f}`)}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t("adminMesas.qr.formatMeta", {
                        size: f === "sticker" ? `Ø ${w / 10} cm` : `${w} × ${h} mm`,
                        perSheet: f === "tent" ? 1 : cols * rows,
                      })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section icon={Palette} title={t("adminMesas.qr.templateTitle")}>
          <div className="grid grid-cols-4 gap-2">
            {QR_TEMPLATES.map((tpl) => (
              <button
                key={tpl}
                type="button"
                aria-pressed={style.template === tpl}
                onClick={() => update({ template: tpl })}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors",
                  style.template === tpl
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                )}
              >
                <QrCard
                  data={sampleItem}
                  style={{ ...style, template: tpl, format: "card" }}
                  labels={labels}
                  lukuLogo={lukuLogo}
                  className="pointer-events-none w-full"
                />
                <span className="text-[11px] font-semibold text-foreground">
                  {t(`adminMesas.qr.template.${tpl}`)}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-1">
            <Label>{t("adminMesas.qr.colorLabel")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              {QR_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={style.color.toLowerCase() === c.toLowerCase()}
                  onClick={() => update({ color: c })}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                    style.color.toLowerCase() === c.toLowerCase()
                      ? "border-foreground ring-2 ring-offset-2 ring-offset-card"
                      : "border-white shadow",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="relative inline-flex h-8 items-center gap-2 rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground">
                <span
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ backgroundColor: style.color }}
                />
                {style.color.toUpperCase()}
                <input
                  type="color"
                  value={style.color}
                  onChange={(e) => update({ color: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label={t("adminMesas.qr.customColor")}
                />
              </label>
            </div>
          </div>
        </Section>

        <Section icon={ImagePlus} title={t("adminMesas.qr.logoTitle")}>
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-surface">
              {logo ? (
                <img src={logo} alt="" className="max-h-14 max-w-[88px] object-contain" />
              ) : (
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={uploadingLogo}
                onClick={() => fileRef.current?.click()}
              >
                {uploadingLogo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {logo ? t("adminMesas.qr.logoReplace") : t("adminMesas.qr.logoUpload")}
              </Button>
              {logo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-muted-foreground hover:text-destructive"
                  onClick={() => void removeLogo()}
                >
                  <Trash2 className="h-4 w-4" /> {t("adminMesas.qr.logoRemove")}
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadLogo(file);
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">{t("adminMesas.qr.logoHint")}</p>
          <ToggleRow
            id="qr-show-logo"
            label={t("adminMesas.qr.showLogo")}
            checked={style.showLogo}
            disabled={!logo}
            onChange={(v) => update({ showLogo: v })}
          />
          <ToggleRow
            id="qr-logo-center"
            label={t("adminMesas.qr.logoInQr")}
            hint={t("adminMesas.qr.logoInQrHint")}
            checked={style.logoInQr}
            disabled={!logo}
            onChange={(v) => update({ logoInQr: v })}
          />
        </Section>

        <Section icon={Type} title={t("adminMesas.qr.textTitle")}>
          <div className="space-y-1.5">
            <Label htmlFor="qr-headline">{t("adminMesas.qr.headlineLabel")}</Label>
            <Input
              id="qr-headline"
              value={style.headline}
              maxLength={80}
              placeholder={labels.headline}
              onChange={(e) => update({ headline: e.target.value })}
            />
          </div>
          <ToggleRow
            id="qr-show-table"
            label={t("adminMesas.qr.showTable")}
            checked={style.showTable}
            onChange={(v) => update({ showTable: v })}
          />
          <ToggleRow
            id="qr-show-name"
            label={t("adminMesas.qr.showName")}
            checked={style.showName}
            onChange={(v) => update({ showName: v })}
          />
          <ToggleRow
            id="qr-show-luku"
            label={t("adminMesas.qr.showLuku")}
            hint={t("adminMesas.qr.showLukuHint")}
            checked={style.showLuku}
            onChange={(v) => update({ showLuku: v })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qr-wifi">{t("adminMesas.qr.wifiName")}</Label>
              <Input
                id="qr-wifi"
                value={style.wifiName}
                maxLength={60}
                onChange={(e) => update({ wifiName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-wifi-pass">{t("adminMesas.qr.wifiPassword")}</Label>
              <Input
                id="qr-wifi-pass"
                value={style.wifiPassword}
                maxLength={60}
                onChange={(e) => update({ wifiPassword: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qr-footnote">{t("adminMesas.qr.footnoteLabel")}</Label>
            <Input
              id="qr-footnote"
              value={style.footnote}
              maxLength={120}
              placeholder={t("adminMesas.qr.footnotePlaceholder")}
              onChange={(e) => update({ footnote: e.target.value })}
            />
          </div>
        </Section>
      </div>

      {printing && (
        <QrPrintSheets
          items={items}
          style={style}
          labels={labels}
          lukuLogo={lukuLogo}
          foldLabel={t("adminMesas.qr.foldHere")}
          onDone={() => setPrinting(false)}
        />
      )}
    </div>
  );
}
