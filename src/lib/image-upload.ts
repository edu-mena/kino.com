/**
 * Lê um ficheiro de imagem escolhido pelo usuário e devolve um data URL
 * redimensionado (máx. `maxDimension` no lado maior, JPEG a ~75% de
 * qualidade). Sem backend/upload real, a imagem fica guardada tal e qual no
 * localStorage — uma foto de telemóvel sem redimensionar facilmente
 * ultrapassa a quota do browser (~5-10MB por origem, para TODOS os dados da
 * app), por isso o redimensionamento aqui não é opcional.
 */
export function fileToResizedDataUrl(file: File, maxDimension = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("O ficheiro escolhido não é uma imagem."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Não foi possível processar a imagem."));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("O navegador não suporta o processamento de imagens."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Lê um ficheiro qualquer e devolve o data URL cru, sem redimensionar. Para
 * vídeos de stories (não dá para "encolher" um vídeo no browser sem um
 * codec) — o tamanho é limitado por `maxBytes` a montante, senão o data URL
 * rebenta a quota do localStorage.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro."));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/** Dimensões finais de um corte: o lado maior fica em `maxDimension` e o
 * outro deriva do rácio (largura ÷ altura). */
export function cropOutputSize(
  aspect: number,
  maxDimension: number,
): { width: number; height: number } {
  return aspect >= 1
    ? { width: maxDimension, height: Math.max(1, Math.round(maxDimension / aspect)) }
    : { width: Math.max(1, Math.round(maxDimension * aspect)), height: maxDimension };
}

/**
 * Recorta `img` pela janela `src` (em píxeis naturais da imagem) e devolve
 * um data URL JPEG do tamanho `out`. A janela é ajustada aos limites da
 * imagem antes de desenhar, para nunca pintar fora dos bordos.
 */
export function croppedImageToDataUrl(
  img: HTMLImageElement,
  src: { x: number; y: number; w: number; h: number },
  out: { width: number; height: number },
  quality = 0.82,
): string {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const w = Math.min(src.w, iw);
  const h = Math.min(src.h, ih);
  const x = Math.min(Math.max(0, src.x), iw - w);
  const y = Math.min(Math.max(0, src.y), ih - h);

  const canvas = document.createElement("canvas");
  canvas.width = out.width;
  canvas.height = out.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("O navegador não suporta o processamento de imagens.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, x, y, w, h, 0, 0, out.width, out.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Duração (segundos) de um ficheiro de vídeo, lida dos metadados. */
export function getVideoDurationSec(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler o vídeo."));
    };
    video.src = url;
  });
}
