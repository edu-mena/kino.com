import { useState, type ImgHTMLAttributes } from "react";
import { cdnSrcSet, cdnUrl } from "@/lib/image-cdn";
import { cn } from "@/lib/utils";

type LazyImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  /**
   * Larguras (px) a gerar no `srcset` quando há um proxy de imagem
   * configurado (`VITE_IMAGE_CDN`). Combinar com `sizes`.
   */
  widths?: number[];
  /** Prioridade de carregamento para imagens acima da dobra. */
  priority?: boolean;
};

/**
 * `<img>` para fotos de conteúdo (pratos, restaurantes) — que vêm de URLs
 * externas, com latência de rede real, ao contrário do resto dos dados da
 * app (síncronos, em memória).
 *
 * - placeholder animado (mesmo tom do `bg-surface` dos cards) até decodificar;
 * - `loading="lazy"` + `decoding="async"` por omissão;
 * - com `widths` + `sizes` e um proxy ativo, serve `srcset` responsivo em WebP.
 */
export function LazyImage({
  className,
  onLoad,
  src,
  widths,
  sizes,
  priority,
  ...props
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);

  const stringSrc = typeof src === "string" ? src : undefined;
  const resolvedSrc = stringSrc
    ? cdnUrl(stringSrc, widths?.length ? { width: Math.max(...widths) } : {})
    : src;
  const srcSet = stringSrc && widths?.length ? cdnSrcSet(stringSrc, widths) : undefined;

  return (
    <img
      src={resolvedSrc}
      {...(srcSet ? { srcSet, sizes } : {})}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      className={cn(!loaded && "animate-pulse bg-surface", className)}
      {...props}
    />
  );
}
