import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fileToDataUrl, fileToResizedDataUrl, getVideoDurationSec } from "@/lib/image-upload";

/** Vídeo até este tamanho — um data URL maior rebenta a quota do localStorage. */
const MAX_VIDEO_BYTES = 5 * 1024 * 1024;

export type UploadMediaMeta = { mediaType: "image" | "video"; durationSec?: number };

/**
 * Campo de media reutilizável — link OU upload do dispositivo (extraído
 * de `dish-form-dialog.tsx`, agora também usado pelo formulário de
 * stories). Controlado: `value`/`onChange` guardam sempre a string final
 * (URL colada ou data URL), nunca o `File` em si.
 *
 * `accept="media"` (usado pelos stories) aceita também vídeo: valida a
 * duração (`maxVideoSec`) e o tamanho, guarda o data URL cru e informa o
 * `mediaType`/`durationSec` via `onMediaChange`.
 */
export function ImageUploadField({
  value,
  onChange,
  onUploadingChange,
  onMediaChange,
  accept = "image",
  maxVideoSec = 20,
  label = "Imagem",
  helpText = "Cole um link de imagem ou carregue uma foto do dispositivo. Em branco, usa uma imagem genérica.",
  mediaType = "image",
}: {
  value: string;
  onChange: (value: string) => void;
  /** Avisa quem usa o campo enquanto um upload está a processar — útil
   * para desativar o botão de submeter do formulário nesse intervalo. */
  onUploadingChange?: (uploading: boolean) => void;
  /** Só no modo `accept="media"`: informa o tipo/duração da media escolhida. */
  onMediaChange?: (meta: UploadMediaMeta) => void;
  accept?: "image" | "media";
  maxVideoSec?: number;
  label?: string;
  helpText?: string;
  /** Tipo da media atual (para o preview escolher `<img>` vs `<video>`). */
  mediaType?: "image" | "video";
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    onUploadingChange?.(true);
    try {
      if (accept === "media" && file.type.startsWith("video/")) {
        const durationSec = await getVideoDurationSec(file);
        if (durationSec > maxVideoSec + 0.5) {
          toast.error(`O vídeo tem de ter no máximo ${maxVideoSec} segundos.`);
          return;
        }
        if (file.size > MAX_VIDEO_BYTES) {
          toast.error("O vídeo é demasiado grande (máx. 5 MB).");
          return;
        }
        onChange(await fileToDataUrl(file));
        onMediaChange?.({ mediaType: "video", durationSec: Math.round(durationSec) });
      } else {
        onChange(await fileToResizedDataUrl(file));
        onMediaChange?.({ mediaType: "image" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível carregar o ficheiro.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  const isUploaded = value.startsWith("data:");
  const showVideo = mediaType === "video";

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : value ? (
            showVideo ? (
              <video src={value} className="h-full w-full object-cover" muted playsInline />
            ) : (
              <img src={value} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={isUploaded ? "" : value}
            onChange={(e) => {
              onChange(e.target.value);
              onMediaChange?.({ mediaType: "image" });
            }}
            placeholder={isUploaded ? "Ficheiro carregado do dispositivo" : "https://..."}
            disabled={isUploaded}
          />
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={accept === "media" ? "image/*,video/*" : "image/*"}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary"
            >
              <ImagePlus className="h-3.5 w-3.5" /> Carregar do dispositivo
            </button>
            {isUploaded && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  onMediaChange?.({ mediaType: "image" });
                }}
                className="text-xs font-semibold text-muted-foreground hover:text-destructive"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </div>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}
