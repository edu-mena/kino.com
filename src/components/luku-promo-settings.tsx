import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateApiSiteSettings } from "@/data/api-site-content";
import { useTranslation } from "@/i18n";
import { refreshSiteContentPublic, useSiteContentPublic } from "@/lib/site-content";

const FLAG = "home.lukuPromo";
const TEXT_KEYS = {
  title: "home.promoVideoTitle",
  description: "home.promoVideoDescription",
  cta: "home.promoVideoCta",
} as const;

/**
 * O slide "Veja a Luku em ação" do carrossel da home não é uma promoção
 * registada (é fixo, com o vídeo da página Luku) — por isso não aparecia na
 * lista abaixo e não havia como o desligar. Aqui: ligar/desligar e os
 * textos. O vídeo é o da página Luku (Conteúdo → Páginas públicas → Luku).
 */
export function LukuPromoSettings({ token }: { token: string | null }) {
  const { t } = useTranslation();
  const { content } = useSiteContentPublic();
  const guestContent = content?.settings.guestContent;
  const [enabled, setEnabled] = useState(true);
  const [texts, setTexts] = useState({ title: "", description: "", cta: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!guestContent) return;
    setEnabled(guestContent.flags?.[FLAG] ?? true);
    setTexts({
      title: guestContent.texts?.[TEXT_KEYS.title] ?? "",
      description: guestContent.texts?.[TEXT_KEYS.description] ?? "",
      cta: guestContent.texts?.[TEXT_KEYS.cta] ?? "",
    });
  }, [guestContent]);

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await updateApiSiteSettings(
        {
          guestContent: {
            flags: { [FLAG]: enabled },
            texts: {
              [TEXT_KEYS.title]: texts.title.trim(),
              [TEXT_KEYS.description]: texts.description.trim(),
              [TEXT_KEYS.cta]: texts.cta.trim(),
            },
          },
        },
        token,
      );
      toast.success(t("sistema.promocoes.lukuPromoSaved"));
      void refreshSiteContentPublic();
    } catch {
      toast.error(t("sistema.conteudo.saveFailedError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card-soft mb-6 space-y-4 p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Play className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-sm font-bold text-foreground">
            {t("sistema.promocoes.lukuPromoTitle")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("sistema.promocoes.lukuPromoDescription")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Label htmlFor="luku-promo-enabled" className="text-xs font-semibold">
            {enabled ? t("sistema.promocoes.lukuPromoOn") : t("sistema.promocoes.lukuPromoOff")}
          </Label>
          <Switch id="luku-promo-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {enabled && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="luku-promo-title">{t("sistema.conteudo.roleTitle")}</Label>
            <Input
              id="luku-promo-title"
              value={texts.title}
              placeholder={t(TEXT_KEYS.title)}
              maxLength={600}
              onChange={(e) => setTexts((d) => ({ ...d, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="luku-promo-description">{t("sistema.conteudo.roleText")}</Label>
            <Textarea
              id="luku-promo-description"
              rows={2}
              className="rounded-xl"
              value={texts.description}
              placeholder={t(TEXT_KEYS.description)}
              maxLength={600}
              onChange={(e) => setTexts((d) => ({ ...d, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="luku-promo-cta">{t("sistema.conteudo.roleButton")}</Label>
            <Input
              id="luku-promo-cta"
              value={texts.cta}
              placeholder={t(TEXT_KEYS.cta)}
              maxLength={600}
              onChange={(e) => setTexts((d) => ({ ...d, cta: e.target.value }))}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("sistema.promocoes.lukuPromoVideoNote")}
          </p>
        </div>
      )}

      <Button type="button" onClick={save} className="rounded-xl" disabled={saving || !token}>
        {t("sistema.conteudo.saveButton")}
      </Button>
    </section>
  );
}
