import { Loader2, Move, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n";
import { cropOutputSize, croppedImageToDataUrl } from "@/lib/image-upload";

const MAX_ZOOM = 4;
/** Teto de altura do enquadramento — nunca acima disto nem de ~52% do ecrã,
 * para o diálogo caber sem ser cortado em ecrãs baixos. */
const VIEWPORT_H_CAP = 420;

type Offset = { x: number; y: number };

function viewportFor(containerW: number, aspect: number, maxH: number) {
  let w = Math.max(1, containerW);
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  return { w: Math.round(w), h: Math.round(h) };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Editor de corte de imagem — arrastar para posicionar, deslizador (ou
 * roda do rato) para aproximar. O enquadramento tem rácio fixo (`aspect`)
 * e a imagem cobre-o sempre, por isso não há bordas vazias. Ao confirmar,
 * recorta para `maxDimension` no lado maior e devolve um data URL JPEG.
 */
export function ImageCropper({
  file,
  open,
  onOpenChange,
  aspect,
  maxDimension,
  hint,
  onConfirm,
}: {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aspect: number;
  maxDimension: number;
  /** Texto de orientação já traduzido (ex.: "centre o prato…"). */
  hint: string;
  onConfirm: (dataUrl: string) => void;
}) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [containerW, setContainerW] = useState(0);
  const [maxViewportH, setMaxViewportH] = useState(VIEWPORT_H_CAP);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  // Carrega o ficheiro escolhido.
  useEffect(() => {
    if (!open || !file) {
      setImg(null);
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setZoom(1);
    setProcessing(false);
    const im = new Image();
    im.onload = () => setImg(im);
    im.onerror = () => {
      toast.error(t("imageCropper.failed"));
      onOpenChange(false);
    };
    im.src = url;
    return () => {
      URL.revokeObjectURL(url);
      setImg(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file]);

  // Espaço disponível para o enquadramento (largura do diálogo + altura do ecrã).
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      setContainerW(containerRef.current?.clientWidth ?? 0);
      setMaxViewportH(Math.min(VIEWPORT_H_CAP, Math.round(window.innerHeight * 0.52)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, img]);

  const iw = img?.naturalWidth ?? 0;
  const ih = img?.naturalHeight ?? 0;
  const vp = viewportFor(containerW, aspect, maxViewportH);
  const baseScale = iw && ih ? Math.max(vp.w / iw, vp.h / ih) : 1;
  const scale = baseScale * zoom;
  const dw = iw * scale;
  const dh = ih * scale;

  const clampOffset = useCallback(
    (o: Offset, s = scale): Offset => ({
      x: clamp(o.x, vp.w - iw * s, 0),
      y: clamp(o.y, vp.h - ih * s, 0),
    }),
    [scale, vp.w, vp.h, iw, ih],
  );

  // Centra a imagem quando (re)carrega ou o enquadramento muda de tamanho.
  useEffect(() => {
    if (!img || !containerW) return;
    setOffset({ x: (vp.w - dw) / 2, y: (vp.h - dh) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, containerW, aspect]);

  const applyZoom = (next: number) => {
    if (!img) return;
    const z = clamp(next, 1, MAX_ZOOM);
    const sNew = baseScale * z;
    const cx = vp.w / 2;
    const cy = vp.h / 2;
    const nx = (cx - offset.x) / scale;
    const ny = (cy - offset.y) / scale;
    setZoom(z);
    setOffset(clampOffset({ x: cx - nx * sNew, y: cy - ny * sNew }, sNew));
  };

  // Arrastar para posicionar.
  useEffect(() => {
    if (!open) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setOffset(clampOffset({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }));
    };
    const up = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [open, clampOffset]);

  const confirm = () => {
    if (!img) return;
    setProcessing(true);
    try {
      const src = {
        x: -offset.x / scale,
        y: -offset.y / scale,
        w: vp.w / scale,
        h: vp.h / scale,
      };
      const dataUrl = croppedImageToDataUrl(img, src, cropOutputSize(aspect, maxDimension));
      onConfirm(dataUrl);
      onOpenChange(false);
    } catch {
      toast.error(t("imageCropper.failed"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !processing && onOpenChange(o)}>
      <DialogContent className="flex max-h-[92dvh] max-w-lg flex-col gap-0 overflow-hidden rounded-[1.5rem] border-none bg-card p-0">
        <div className="px-6 pt-6">
          <DialogTitle className="font-display text-lg font-bold">
            {t("imageCropper.title")}
          </DialogTitle>
          <DialogDescription>{t("imageCropper.description")}</DialogDescription>
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-1">
          <div ref={containerRef} className="flex justify-center">
            <div
              className="relative touch-none select-none overflow-hidden rounded-xl bg-black [cursor:grab] active:[cursor:grabbing]"
              style={{ width: vp.w, height: vp.h }}
              onPointerDown={(e) => {
                if (!img) return;
                (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
              }}
              onWheel={(e) => applyZoom(zoom * (e.deltaY < 0 ? 1.12 : 0.9))}
            >
              {objectUrl && img && (
                <img
                  src={objectUrl}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none"
                  style={{ left: offset.x, top: offset.y, width: dw, height: dh }}
                />
              )}
              {/* Grelha de terços — ajuda a centrar */}
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
                <div className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
                <div className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
                <div className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/25" />
              </div>
              {!img && (
                <div className="absolute inset-0 grid place-items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white/70" />
                </div>
              )}
            </div>
          </div>

          <label className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="sr-only">{t("imageCropper.zoom")}</span>
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => applyZoom(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
              aria-label={t("imageCropper.zoom")}
            />
          </label>

          <p className="flex items-start gap-2 rounded-xl bg-surface p-3 text-xs text-muted-foreground">
            <Move className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{hint}</span>
          </p>
        </div>

        <div className="mt-3 flex gap-2 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={processing}
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={processing || !img}
            onClick={confirm}
            className="flex-1 rounded-xl"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t("imageCropper.processing")}
              </>
            ) : (
              t("imageCropper.use")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
