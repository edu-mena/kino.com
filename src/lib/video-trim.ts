import { fileToDataUrl } from "@/lib/image-upload";

/**
 * Corte de vídeo no browser (sem backend). O caminho principal recodifica só
 * a janela escolhida com `canvas.captureStream` + `MediaRecorder` (WebM
 * reduzido, com áudio) — dá um `data:` URL pequeno que cabe no localStorage.
 * Onde isso não existe, o recuo guarda o ficheiro original com um marcador
 * `#t=início,fim` e a reprodução força o `currentTime`.
 */

/** Lado maior do vídeo recodificado. */
const MAX_DIMENSION = 720;
/** Data URL recodificado maior do que isto → erro (localStorage ~5-10 MB). */
const MAX_OUTPUT_BYTES = 4.5 * 1024 * 1024;
/** No recuo (sem recodificação) guarda-se o ficheiro inteiro — tem de ser pequeno. */
const MAX_FALLBACK_BYTES = 12 * 1024 * 1024;
/** Corta a recodificação se algo encravar. */
const ENCODE_TIMEOUT_MS = 30_000;

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(?:[#?]|$)/i;

/** `src` é um vídeo? (data URL de vídeo ou URL com extensão de vídeo) */
export function isVideoSrc(src: string): boolean {
  return src.startsWith("data:video") || VIDEO_EXT.test(src);
}

/** Lê o marcador `#t=a,b` (segundos) de um src, se existir. */
export function parseTimeFragment(src: string): { start: number; end: number } | null {
  const m = src.match(/#t=([\d.]+),([\d.]+)/);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return { start, end };
}

class TrimError extends Error {
  constructor(
    public code: "tooLarge" | "failed",
    message: string,
  ) {
    super(message);
  }
}
export { TrimError };

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c));
}

type VideoWithCapture = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

function canReencode(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof document !== "undefined" &&
    typeof document.createElement("canvas").captureStream === "function"
  );
}

function reencode(file: File, startSec: number, endSec: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video") as VideoWithCapture;
    video.src = url;
    video.muted = false;
    video.playsInline = true;
    video.preload = "auto";

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };
    const fail = (err: unknown) => {
      cleanup();
      reject(
        err instanceof TrimError
          ? err
          : new TrimError("failed", err instanceof Error ? err.message : "reencode"),
      );
    };

    const timeout = window.setTimeout(
      () => fail(new TrimError("failed", "timeout")),
      ENCODE_TIMEOUT_MS,
    );

    video.onerror = () => fail(new Error("video load"));
    video.onloadedmetadata = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight || 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(2, Math.round((video.videoWidth || MAX_DIMENSION) * scale));
      canvas.height = Math.max(2, Math.round((video.videoHeight || MAX_DIMENSION) * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return fail(new TrimError("failed", "no 2d context"));

      const canvasStream = canvas.captureStream(30);
      const combined = new MediaStream(canvasStream.getVideoTracks());
      try {
        const audioSrc = video.captureStream?.() ?? video.mozCaptureStream?.();
        audioSrc?.getAudioTracks().forEach((tr) => combined.addTrack(tr));
      } catch {
        /* sem áudio — segue com vídeo só */
      }

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(combined, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.onerror = () => fail(new Error("recorder"));
      recorder.onstop = () => {
        window.clearTimeout(timeout);
        const blob = new Blob(chunks, { type: mimeType ?? "video/webm" });
        const reader = new FileReader();
        reader.onerror = () => fail(new Error("read blob"));
        reader.onload = () => {
          cleanup();
          const dataUrl = reader.result as string;
          if (dataUrl.length * 0.75 > MAX_OUTPUT_BYTES) {
            reject(new TrimError("tooLarge", "output too large"));
            return;
          }
          resolve(dataUrl);
        };
        reader.readAsDataURL(blob);
      };

      let stopped = false;
      const stop = () => {
        if (stopped) return;
        stopped = true;
        video.pause();
        recorder.stop();
      };
      const drawFrame = () => {
        if (stopped) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (video.currentTime >= endSec - 0.03 || video.ended) {
          stop();
          return;
        }
        if ("requestVideoFrameCallback" in video) {
          (
            video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => number }
          ).requestVideoFrameCallback(drawFrame);
        } else {
          requestAnimationFrame(drawFrame);
        }
      };

      video.onseeked = () => {
        video.onseeked = null;
        recorder.start();
        void video.play().then(drawFrame).catch(fail);
      };
      video.currentTime = Math.max(0, startSec);
    };
  });
}

/**
 * Devolve `{ src, durationSec }` com a janela `[startSec, endSec]` do `file`.
 * Tenta recodificar; se não der, guarda o original com `#t=`.
 */
export async function trimVideo(
  file: File,
  startSec: number,
  endSec: number,
): Promise<{ src: string; durationSec: number }> {
  const durationSec = Math.max(1, Math.round(endSec - startSec));

  if (canReencode()) {
    try {
      const src = await reencode(file, startSec, endSec);
      return { src, durationSec };
    } catch (err) {
      if (err instanceof TrimError && err.code === "tooLarge") throw err;
      // qualquer outra falha → recuo
    }
  }

  if (file.size > MAX_FALLBACK_BYTES) {
    throw new TrimError("tooLarge", "fallback file too large");
  }
  const raw = await fileToDataUrl(file);
  return { src: `${raw}#t=${startSec.toFixed(2)},${endSec.toFixed(2)}`, durationSec };
}
