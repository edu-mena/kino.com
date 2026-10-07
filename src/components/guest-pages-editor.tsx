import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageUploadField } from "@/components/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateApiSiteSettings } from "@/data/api-site-content";
import type { SiteContent } from "@/data/types-site-content";
import { useTranslation } from "@/i18n";
import {
  GUEST_MEDIA_DEFAULTS,
  GUEST_PAGES,
  LUKU_VIDEO_DEFAULT,
  type GuestField,
  type GuestPageId,
  type GuestTextRole,
} from "@/lib/guest-content-fields";
import { refreshSiteContentPublic } from "@/lib/site-content";

const ROLE_LABEL: Record<GuestTextRole, string> = {
  title: "sistema.conteudo.roleTitle",
  text: "sistema.conteudo.roleText",
  button: "sistema.conteudo.roleButton",
  item: "sistema.conteudo.roleItem",
  alt: "sistema.conteudo.roleAlt",
};

/**
 * "Páginas públicas" em /sistema/conteudo: os textos, imagens e vídeo das
 * páginas para visitantes (ver `GUEST_PAGES`). Cada campo mostra o texto
 * original como sugestão; vazio = fica o original (traduzido). Guardar envia
 * só as chaves desta página — as outras páginas não são tocadas.
 */
export function GuestPagesEditor({
  content,
  token,
  onSaved,
}: {
  content: SiteContent | null;
  token: string | null;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [pageId, setPageId] = useState<GuestPageId>("home");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [media, setMedia] = useState<Record<string, string>>({});
  const [videoDataUrl, setVideoDataUrl] = useState("");
  const [videoReset, setVideoReset] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const settings = content?.settings;
  // Só quando o conteúdo chega/muda no servidor — nunca a meio de edições.
  useEffect(() => {
    if (!settings) return;
    setTexts({ ...(settings.guestContent?.texts ?? {}) });
    setMedia({ ...(settings.guestContent?.media ?? {}) });
    setVideoDataUrl("");
    setVideoReset(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.guestContent, settings?.lukuVideoUrl, settings?.lukuVideoStatus]);

  const page = GUEST_PAGES.find((p) => p.id === pageId)!;
  const pageFields = page.sections.flatMap((s) => s.fields);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const pageTexts: Record<string, string> = {};
      const pageMedia: Record<string, string> = {};
      for (const field of pageFields) {
        if (field.kind === "text") pageTexts[field.key] = texts[field.key]?.trim() ?? "";
        if (field.kind === "image") {
          const value = media[field.key] ?? "";
          // A imagem original (do site) não é uma edição — volta a ela.
          pageMedia[field.key] = value === GUEST_MEDIA_DEFAULTS[field.key] ? "" : value;
        }
      }
      const hasVideo = pageFields.some((f) => f.kind === "video");
      await updateApiSiteSettings(
        {
          guestContent: { texts: pageTexts, media: pageMedia },
          ...(hasVideo && videoDataUrl ? { lukuVideoDataUrl: videoDataUrl } : {}),
          ...(hasVideo && videoReset && !videoDataUrl ? { lukuVideoReset: true } : {}),
        },
        token,
      );
      toast.success(t("sistema.conteudo.savedToast"));
      onSaved();
      void refreshSiteContentPublic();
    } catch {
      toast.error(t("sistema.conteudo.saveFailedError"));
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: GuestField, index: number) => {
    if (field.kind === "text") {
      const id = `guest-${field.key}`;
      const Control = field.multiline ? Textarea : Input;
      return (
        <div key={field.key} className="space-y-1.5">
          <Label htmlFor={id}>{t(ROLE_LABEL[field.role])}</Label>
          <Control
            id={id}
            value={texts[field.key] ?? ""}
            placeholder={t(field.key)}
            maxLength={600}
            {...(field.multiline ? { rows: 2, className: "rounded-xl" } : {})}
            onChange={(e) => setTexts((d) => ({ ...d, [field.key]: e.target.value }))}
          />
        </div>
      );
    }

    if (field.kind === "image") {
      const original = GUEST_MEDIA_DEFAULTS[field.key];
      const value = media[field.key] || original;
      return (
        <div key={field.key} className="space-y-2">
          <ImageUploadField
            value={value}
            onChange={(v) => setMedia((d) => ({ ...d, [field.key]: v }))}
            onUploadingChange={setUploading}
            label={t("sistema.conteudo.imageLabel")}
            helpText={t("sistema.conteudo.imageHelp")}
            crop={field.crop}
            purpose="site"
            token={token}
          />
          {value !== original && (
            <button
              type="button"
              onClick={() => setMedia((d) => ({ ...d, [field.key]: "" }))}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {t("sistema.conteudo.imageReset")}
            </button>
          )}
        </div>
      );
    }

    // Vídeo da página Luku — novo ficheiro vai no "Guardar" e é processado
    // no servidor (como o vídeo da página Sobre).
    const customVideo = settings?.lukuVideoUrl ?? null;
    const shown =
      videoDataUrl || (videoReset ? LUKU_VIDEO_DEFAULT : customVideo || LUKU_VIDEO_DEFAULT);
    return (
      <div key={`video-${index}`} className="space-y-2">
        <ImageUploadField
          value={shown}
          onChange={(v) => {
            if (v.startsWith("data:video")) {
              setVideoDataUrl(v);
              setVideoReset(false);
            } else if (v.startsWith("data:")) {
              toast.error(t("sistema.conteudo.videoNotVideo"));
            }
          }}
          onUploadingChange={setUploading}
          accept="media"
          mediaType="video"
          maxVideoSec={60}
          label={t("sistema.conteudo.videoLabel")}
          helpText={t("sistema.conteudo.videoHelp")}
        />
        {settings?.lukuVideoStatus === "processing" && !videoDataUrl && (
          <p className="text-xs font-semibold text-brand">
            {t("sistema.conteudo.videoProcessing")}
          </p>
        )}
        {settings?.lukuVideoStatus === "failed" && !videoDataUrl && (
          <p className="text-xs font-semibold text-destructive">
            {t("sistema.conteudo.videoFailed")}
          </p>
        )}
        {videoReset && !videoDataUrl ? (
          <p className="text-xs text-muted-foreground">{t("sistema.conteudo.videoResetPending")}</p>
        ) : (
          (customVideo || videoDataUrl) && (
            <button
              type="button"
              onClick={() => {
                setVideoDataUrl("");
                setVideoReset(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {t("sistema.conteudo.videoReset")}
            </button>
          )
        )}
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-6">
      <p className="text-sm text-muted-foreground">{t("sistema.conteudo.pagesIntro")}</p>

      <div role="tablist" className="flex flex-wrap gap-2">
        {GUEST_PAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === pageId}
            onClick={() => setPageId(p.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              p.id === pageId
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>

      {page.sections.map((section) => (
        <section key={section.titleKey} className="card-soft space-y-4 p-5">
          <div>
            <h2 className="font-display text-base font-bold text-primary">{t(section.titleKey)}</h2>
            {section.noteKey && (
              <p className="mt-1 text-xs text-muted-foreground">{t(section.noteKey)}</p>
            )}
          </div>
          {section.fields.map(renderField)}
        </section>
      ))}

      <Button type="submit" className="rounded-xl" disabled={saving || uploading || !token}>
        {t("sistema.conteudo.savePage")}
      </Button>
    </form>
  );
}
