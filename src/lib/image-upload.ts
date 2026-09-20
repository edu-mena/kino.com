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
 * Lê um ficheiro (ou blob — `File` é sempre um `Blob`, útil para o que vem
 * de `fetch()` ao ler conteúdo partilhado doutra app, ver
 * `@/lib/pending-share`) e devolve o data URL cru, sem redimensionar. Para
 * vídeos de stories (não dá para "encolher" um vídeo no browser sem um
 * codec) — o tamanho é limitado por `maxBytes` a montante, senão o data URL
 * rebenta a quota do localStorage.
 */
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro."));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/** Máximo aceite para um PDF (comprovativo ou fatura) — ao contrário de uma
 * foto, não dá para "encolher" um PDF no browser, por isso o limite é ao
 * ficheiro original (a quota do localStorage é a mesma preocupação de
 * sempre). */
export const MAX_DOCUMENT_PDF_BYTES = 4 * 1024 * 1024;

/**
 * Documento anexado a um pedido (comprovativo de pagamento do cliente,
 * fatura do restaurante) — aceita foto (redimensionada, como qualquer outro
 * upload) OU PDF (guardado tal e qual, só com um limite de tamanho, já que
 * não há como comprimi-lo no browser).
 */
export function fileToDocumentDataUrl(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    if (file.size > MAX_DOCUMENT_PDF_BYTES) {
      return Promise.reject(new Error("O PDF é grande demais (máx. 4 MB)."));
    }
    return fileToDataUrl(file);
  }
  return fileToResizedDataUrl(file, 1000);
}

/** Data URL cujo MIME é `application/pdf` — é assim que se distingue um
 * documento em PDF de uma foto, sem precisar de um campo à parte (ver
 * `fileToDocumentDataUrl`). Usado por quem MOSTRA o documento (comprovativo
 * ou fatura), dos dois lados (cliente em `/entrega`, restaurante em
 * `/admin/pedidos`). */
export function isPdfDataUrl(src: string | undefined): boolean {
  return !!src?.startsWith("data:application/pdf");
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
 * um data URL JPEG do tamanho `out`.
 *
 * A janela pedida pode ultrapassar os limites reais da imagem nos dois
 * eixos — acontece sempre que o `ImageCropper` deixa fazer zoom-out abaixo
 * de "cover" (uma foto horizontal contida por inteiro num enquadramento
 * vertical, por ex.). Nesse caso, em vez de esticar a imagem toda para
 * preencher a saída (distorcia-a, perdendo o "letterbox" que se via na
 * pré-visualização), pinta o fundo a preto e desenha só a parte real da
 * imagem, à escala certa, no sítio certo — mantém as barras pretas também
 * no resultado final, tal como apareciam a editar.
 */
export function croppedImageToDataUrl(
  img: HTMLImageElement,
  src: { x: number; y: number; w: number; h: number },
  out: { width: number; height: number },
  quality = 0.82,
): string {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;

  const canvas = document.createElement("canvas");
  canvas.width = out.width;
  canvas.height = out.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("O navegador não suporta o processamento de imagens.");
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, out.width, out.height);

  // Só a parte da janela pedida que existe mesmo na imagem.
  const sx = Math.max(0, src.x);
  const sy = Math.max(0, src.y);
  const sw = Math.min(src.x + src.w, iw) - sx;
  const sh = Math.min(src.y + src.h, ih) - sy;
  if (sw <= 0 || sh <= 0) return canvas.toDataURL("image/jpeg", quality); // nada a desenhar (não devia acontecer)

  // Mesma escala pedida (janela → saída), aplicada só a essa parte real —
  // é o que posiciona a imagem no sítio certo dentro da saída, com as
  // barras pretas à volta a preencher o resto.
  const scaleX = out.width / src.w;
  const scaleY = out.height / src.h;
  const dx = (sx - src.x) * scaleX;
  const dy = (sy - src.y) * scaleY;
  const dw = sw * scaleX;
  const dh = sh * scaleY;

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
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
