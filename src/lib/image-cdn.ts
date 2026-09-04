/**
 * As fotos de pratos e restaurantes vêm de URLs de terceiros (Wikipédia,
 * blogs de culinária, CDNs de reviews) — tamanhos imprevisíveis, sem
 * possibilidade de as otimizarmos na origem, e sujeitas a bloqueio de
 * hotlink em produção. Este módulo reescreve essas URLs para passarem por
 * um proxy de redimensionamento, que devolve a imagem no tamanho pedido e
 * em WebP.
 *
 * Ativa-se com `VITE_IMAGE_CDN=wsrv` (ver `.env.local`). Sem essa variável
 * o comportamento é identidade — nada muda, útil em dev/offline e para não
 * enviar tráfego a um terceiro sem uma escolha explícita.
 */
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
  if (PROVIDER === "none" || isBypassed(src) || widths.length === 0) return undefined;
  return widths
    .slice()
    .sort((a, b) => a - b)
    .map((w) => `${cdnUrl(src, { width: w })} ${w}w`)
    .join(", ");
}
