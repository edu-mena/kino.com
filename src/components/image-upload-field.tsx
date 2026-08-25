import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fileToResizedDataUrl } from "@/lib/image-upload";

/**
 * Campo de imagem reutilizável — link OU upload do dispositivo (extraído
 * de `dish-form-dialog.tsx`, agora também usado pelo formulário de
 * stories). Controlado: `value`/`onChange` guardam sempre a string final
 * (URL colada ou data URL redimensionado), nunca o `File` em si.
 */
export function ImageUploadField({
  value,
  onChange,
  onUploadingChange,
  label = "Imagem",
  helpText = "Cole um link de imagem ou carregue uma foto do dispositivo. Em branco, usa uma imagem genérica.",
}: {
  value: string;
  onChange: (value: string) => void;
  /** Avisa quem usa o campo enquanto um upload está a processar — útil
   * para desativar o botão de submeter do formulário nesse intervalo. */
  onUploadingChange?: (uploading: boolean) => void;
  label?: string;
  helpText?: string;
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
      onChange(await fileToResizedDataUrl(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível carregar a imagem.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  const isUploaded = value.startsWith("data:");

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={isUploaded ? "" : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={isUploaded ? "Imagem carregada do dispositivo" : "https://..."}
            disabled={isUploaded}
          />
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
                onClick={() => onChange("")}
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
