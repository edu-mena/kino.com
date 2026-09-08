import { Loader2, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n";
import { TrimError, trimVideo } from "@/lib/video-trim";

const THUMB_COUNT = 12;

/**
 * Controlador de corte de vídeo inspirado no do WhatsApp: tira de fotogramas
 * + duas pegas arrastáveis. Obriga a uma janela entre `minSec` e `maxSec`.
 * Ao confirmar, `trimVideo` recodifica (ou guarda com `#t=`) e devolve o
 * `src` final por `onConfirm`.
 */
export function VideoTrimmer({
  file,
  open,
  onOpenChange,
  onConfirm,
  minSec = 3,
  maxSec = 20,
}: {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (result: { src: string; durationSec: number }) => void;
  minSec?: number;
  maxSec?: number;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"start" | "end" | null>(null);

  const [url, setUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(maxSec);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [processing, setProcessing] = useState(false);

  // Object URL do ficheiro escolhido.
  useEffect(() => {
    if (!open || !file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    setThumbs([]);
    setPlaying(false);
    setProcessing(false);
    return () => URL.revokeObjectURL(u);
  }, [open, file]);

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration;
    setDuration(d);
    if (d < minSec - 0.1) {
      toast.error(t("videoTrimmer.tooShort", { min: minSec }));
      onOpenChange(false);
      return;
    }
    setStart(0);
    setEnd(Math.min(d, maxSec));
    setPlayhead(0);
  };

  // Tira de fotogramas — vídeo offscreen à parte para não perturbar a
  // pré-visualização.
  useEffect(() => {
    if (!url || duration <= 0) return;
    let cancelled = false;
    const v = document.createElement("video");
    v.src = url;
    v.muted = true;
    v.preload = "auto";
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");

    const run = async () => {
      await new Promise<void>((res) => {
        v.onloadeddata = () => res();
      });
      const out: string[] = [];
      for (let i = 0; i < THUMB_COUNT; i += 1) {
        if (cancelled || !ctx) return;
        const time = (i / (THUMB_COUNT - 1)) * Math.max(0, duration - 0.05);
        await new Promise<void>((res) => {
          v.onseeked = () => res();
          v.currentTime = time;
        });
        if (cancelled) return;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        out.push(canvas.toDataURL("image/jpeg", 0.5));
        setThumbs([...out]);
      }
    };
    void run();
    return () => {
      cancelled = true;
      v.src = "";
    };
  }, [url, duration]);

  // Reproduz só a janela [start, end], em loop.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!playing) {
      v.pause();
      return;
    }
    if (v.currentTime < start || v.currentTime >= end) v.currentTime = start;
    void v.play().catch(() => setPlaying(false));
  }, [playing, start, end]);

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime >= end) {
      v.currentTime = start;
    }
    setPlayhead(v.currentTime);
  };

  const clientXToSec = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || duration <= 0) return 0;
      const rect = track.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return frac * duration;
    },
    [duration],
  );

  useEffect(() => {
    if (!open) return;
    const move = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const sec = clientXToSec(e.clientX);
      if (dragRef.current === "start") {
        const next = Math.min(sec, end - minSec);
        setStart(Math.max(0, Math.max(next, end - maxSec)));
      } else {
        const next = Math.max(sec, start + minSec);
        setEnd(Math.min(duration, Math.min(next, start + maxSec)));
      }
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
  }, [open, clientXToSec, start, end, duration, minSec, maxSec]);

  const selected = Math.max(0, end - start);
  const pct = (s: number) => (duration > 0 ? (s / duration) * 100 : 0);

  const confirm = async () => {
    if (!file) return;
    setPlaying(false);
    setProcessing(true);
    try {
      const result = await trimVideo(file, start, end);
      onConfirm(result);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof TrimError && err.code === "tooLarge"
          ? t("videoTrimmer.tooLarge")
          : t("videoTrimmer.failed"),
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !processing && onOpenChange(o)}>
      <DialogContent className="max-w-lg rounded-[1.5rem] border-none bg-card p-6">
        <DialogTitle className="font-display text-lg font-bold">
          {t("videoTrimmer.title")}
        </DialogTitle>
        <DialogDescription>{t("videoTrimmer.description")}</DialogDescription>

        <div className="mt-3 space-y-4">
          <div className="relative overflow-hidden rounded-xl bg-black">
            {url && (
              <video
                ref={videoRef}
                src={url}
                playsInline
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={onTimeUpdate}
                onEnded={() => {
                  const v = videoRef.current;
                  if (v) v.currentTime = start;
                }}
                className="mx-auto max-h-[46vh] w-full object-contain"
              />
            )}
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={t(playing ? "videoTrimmer.pause" : "videoTrimmer.play")}
              className="absolute bottom-2 left-2 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          </div>

          {/* Tira de fotogramas + pegas */}
          <div
            ref={trackRef}
            className="relative h-14 touch-none select-none overflow-hidden rounded-lg border border-border bg-surface"
          >
            <div className="flex h-full w-full">
              {(thumbs.length ? thumbs : Array.from({ length: THUMB_COUNT })).map((src, i) => (
                <div key={i} className="h-full min-w-0 flex-1 bg-surface">
                  {typeof src === "string" && (
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
              ))}
            </div>

            {/* zonas fora da seleção */}
            <div
              className="absolute inset-y-0 left-0 bg-background/70"
              style={{ width: `${pct(start)}%` }}
            />
            <div
              className="absolute inset-y-0 right-0 bg-background/70"
              style={{ width: `${100 - pct(end)}%` }}
            />
            {/* moldura da seleção */}
            <div
              className="pointer-events-none absolute inset-y-0 border-2 border-primary"
              style={{ left: `${pct(start)}%`, right: `${100 - pct(end)}%` }}
            />
            {/* playhead */}
            {playing && (
              <div
                className="pointer-events-none absolute inset-y-0 w-0.5 bg-white"
                style={{ left: `${pct(playhead)}%` }}
              />
            )}
            {/* pegas */}
            {(["start", "end"] as const).map((which) => (
              <div
                key={which}
                onPointerDown={(e) => {
                  e.preventDefault();
                  dragRef.current = which;
                  setPlaying(false);
                }}
                className="absolute inset-y-0 flex w-4 -translate-x-1/2 cursor-ew-resize items-center justify-center"
                style={{ left: `${pct(which === "start" ? start : end)}%` }}
              >
                <span className="h-8 w-1.5 rounded-full bg-primary shadow" />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              {t("videoTrimmer.selectedSec", { sec: selected.toFixed(1) })}
            </span>
            <span className="text-muted-foreground">
              {t("videoTrimmer.range", { min: minSec, max: maxSec })}
            </span>
          </div>

          <div className="flex gap-2">
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
              disabled={processing || selected < minSec - 0.05}
              onClick={confirm}
              className="flex-1 rounded-xl"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("videoTrimmer.processing")}
                </>
              ) : (
                t("videoTrimmer.use")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
