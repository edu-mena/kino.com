import { Download, Minus, Plus, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const clamp = (n: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, n));

function dist(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Visualizador em ecrã inteiro para o comprovativo de pagamento (ou
 * qualquer imagem/PDF que precise de zoom) — usado pelo cliente em
 * `/entrega` e pelo painel do restaurante em `/admin/pedidos`. Antes, ambos
 * só tinham a imagem em miniatura (ou um link `target="_blank"`); nem
 * imagem nem PDF davam para examinar em detalhe sem sair da app.
 *
 * Imagem: zoom/pan próprios (roda do rato, pinça no touch, duplo
 * toque/clique, e botões +/−) — não há biblioteca nenhuma disto no projeto,
 * por isso é feito aqui à mão, sem dependência nova.
 *
 * PDF: `<iframe>` — o motor nativo (Safari/WKWebView no iOS, Chromium no
 * Android) já vem com zoom/scroll próprios para PDF. Como o suporte disto
 * dentro de uma WebView embutida (app nativa) não é garantido em todas as
 * versões de Android, há sempre um link "abrir/transferir" por baixo — abre
 * no leitor de PDF do próprio telemóvel, que sempre tem zoom.
 */
export function MediaLightbox({
  open,
  onOpenChange,
  src,
  title,
  isPdf,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string | null | undefined;
  title: string;
  isPdf?: boolean;
}) {
  const { t } = useTranslation();
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: { x: number; y: number };
  } | null>(null);
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  const onOpenChangeInner = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const zoomTo = (next: number) => {
    const clamped = clamp(next);
    setScale(clamped);
    if (clamped === MIN_SCALE) setPos({ x: 0, y: 0 });
  };

  const onWheel = (e: React.WheelEvent) => {
    if (isPdf) return;
    e.preventDefault();
    zoomTo(scale + (e.deltaY < 0 ? 0.25 : -0.25));
  };

  const onDoubleClick = () => zoomTo(scale > 1 ? 1 : 2.5);

  const onPointerDown = (e: React.PointerEvent) => {
    if (isPdf || scale <= 1) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: pos };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { startX, startY, origin } = dragRef.current;
    setPos({ x: origin.x + (e.clientX - startX), y: origin.y + (e.clientY - startY) });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (isPdf || e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    if (!a || !b) return;
    pinchRef.current = { dist: dist(a, b), scale };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!pinchRef.current || e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    if (!a || !b) return;
    e.preventDefault();
    const ratio = dist(a, b) / pinchRef.current.dist;
    zoomTo(pinchRef.current.scale * ratio);
  };
  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  if (!src) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChangeInner}>
      <DialogContent
        hideCloseButton
        className="left-0 top-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden border-none bg-black/95 p-0 sm:rounded-none lg:left-1/2 lg:top-1/2 lg:h-[88vh] lg:w-[min(90vw,56rem)] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[1.5rem]"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <p className="min-w-0 truncate text-sm font-semibold text-white">{title}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            {!isPdf && (
              <>
                <button
                  type="button"
                  onClick={() => zoomTo(scale - 0.5)}
                  disabled={scale <= MIN_SCALE}
                  aria-label={t("mediaLightbox.zoomOut")}
                  className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => zoomTo(scale + 0.5)}
                  disabled={scale >= MAX_SCALE}
                  aria-label={t("mediaLightbox.zoomIn")}
                  className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={scale === MIN_SCALE}
                  aria-label={t("mediaLightbox.resetZoom")}
                  className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </>
            )}
            <a
              href={src}
              download
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("mediaLightbox.download")}
              className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>

        {isPdf ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <iframe src={src} title={title} className="min-h-0 flex-1 bg-white" />
            <p className="shrink-0 border-t border-white/10 px-4 py-2.5 text-center text-xs text-white/60">
              {t("mediaLightbox.pdfFallbackHint")}{" "}
              <a href={src} target="_blank" rel="noopener noreferrer" className="underline">
                {t("mediaLightbox.pdfFallbackLink")}
              </a>
            </p>
          </div>
        ) : (
          <div
            className="min-h-0 flex-1 touch-none select-none overflow-hidden"
            style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
            onWheel={onWheel}
            onDoubleClick={onDoubleClick}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={src}
              alt=""
              draggable={false}
              className="h-full w-full object-contain transition-transform duration-150 ease-out"
              style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
