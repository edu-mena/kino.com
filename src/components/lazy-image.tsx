import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * `<img>` com um placeholder animado (mesmo tom do `bg-surface` usado nos
 * cards) enquanto a imagem carrega — as imagens de prato/restaurante vêm de
 * URLs externas, com latência de rede real, ao contrário do resto dos dados
 * da app (tudo síncrono, em memória). Sem isto, a primeira vez que uma
 * imagem aparece na tela é um retângulo em branco até decodificar.
 */
export function LazyImage({ className, onLoad, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      loading="lazy"
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      className={cn(!loaded && "animate-pulse bg-surface", className)}
      {...props}
    />
  );
}
