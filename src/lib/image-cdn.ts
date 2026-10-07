/**
 * Imagens no tamanho em que são mostradas, em vez da foto inteira em cada
 * cartão de lista.
 *
 * - Uploads da própria app (`<host>/<pasta>/<dono>/<uuid>.<ext>`): o backend
 *   grava ao lado miniaturas WebP de 160/480/960px
 *   (`MediaUploadService::storeThumbnails`) — aqui só se monta o nome delas.
 *   Sempre ativo; se uma faltar (ex.: falha a gerá-la), `LazyImage` volta ao
 *   original.
 * - URLs de terceiros (links colados): opcionalmente por um proxy de
 *   redimensionamento, com `VITE_IMAGE_CDN=wsrv`. Sem essa variável ficam
 *   como estão. ATENÇÃO: o wsrv.nl não consegue ler do Tigris
 *   (`*.fly.storage.tigris.dev` — "hostname unresolvable"), por isso os
 *   uploads nunca passam por ele.
 */

/** Larguras gravadas pelo backend — `MediaUploadService::THUMBNAIL_WIDTHS`;
 * mudar lá obriga a mudar aqui. */
const THUMBNAIL_WIDTHS = [160, 480, 960] as const;

/** Upload nosso — o mesmo formato de caminho de `storeImage` e das capas de
 * vídeo. Um link externo colado nunca tem este formato. */
const OWN_UPLOAD =
  /^(https?:\/\/[^/?#]+\/(?:dish|cover|wallpaper|gallery|promo|story|partner|site)\/[^/?#]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(?:jpe?g|png|webp|gif)$/i;

/** Miniatura gravada pelo backend mais pequena que ainda cobre `width`
 * (a maior, se nenhuma cobrir). `undefined` se não for um upload nosso. */
export function thumbnailUrl(src: string, width: number): string | undefined {
  const match = OWN_UPLOAD.exec(src);
  if (!match) return undefined;
  const chosen = THUMBNAIL_WIDTHS.find((w) => w >= width) ?? THUMBNAIL_WIDTHS.at(-1);
  return `${match[1]}.w${chosen}.webp`;
}

/** Largura anunciada no `srcset` para o original — maior que qualquer
 * miniatura, para o browser só o escolher quando precisa de mais de 960px
 * (os presets de upload vão até 1600px). */
const ORIGINAL_SRCSET_WIDTH = 1600;
type Provider = "none" | "wsrv";

const PROVIDER: Provider =
  (import.meta.env["VITE_IMAGE_CDN"] as string) === "wsrv" ? "wsrv" : "none";

/** URLs que nunca devem ser reescritas (assets locais do Vite, data/blob). */
function isBypassed(src: string): boolean {
  return !src || src.startsWith("data:") || src.startsWith("blob:") || !/^https?:\/\//i.test(src);
}

export type ImageTransform = { width?: number; quality?: number };

/** Reescreve `src` para o proxy configurado, no tamanho pedido. */
export function cdnUrl(src: string, { width, quality = 78 }: ImageTransform = {}): string {
  if (width) {
    const thumb = thumbnailUrl(src, width);
    if (thumb) return thumb;
  }
  if (PROVIDER === "none" || isBypassed(src)) return src;
  if (PROVIDER === "wsrv") {
    // https://wsrv.nl/docs — `url` sem esquema, `we` = without-enlargement.
    const params = new URLSearchParams({ url: src.replace(/^https?:\/\//i, ""), output: "webp" });
    if (width) params.set("w", String(width));
    params.set("q", String(quality));
    params.set("we", "1");
    return `https://wsrv.nl/?${params.toString()}`;
  }
  return src;
}

/**
 * `srcset` com descritores de largura. Devolve `undefined` quando não há
 * proxy (aí todas as entradas seriam a mesma URL — o browser não ganha nada).
 */
export function cdnSrcSet(src: string, widths: number[]): string | undefined {
  if (widths.length === 0) return undefined;
  // Upload nosso: as miniaturas que existem + o original, e o browser
  // escolhe pela largura mostrada (`sizes`) × densidade do ecrã.
  if (OWN_UPLOAD.test(src)) {
    return [
      ...THUMBNAIL_WIDTHS.map((w) => `${thumbnailUrl(src, w)} ${w}w`),
      `${src} ${ORIGINAL_SRCSET_WIDTH}w`,
    ].join(", ");
  }
  if (PROVIDER === "none" || isBypassed(src)) return undefined;
  return widths
    .slice()
    .sort((a, b) => a - b)
    .map((w) => `${cdnUrl(src, { width: w })} ${w}w`)
    .join(", ");
}
