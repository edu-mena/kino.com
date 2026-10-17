import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { fetchApiPreferences, updateApiPreferences } from "@/data/api-preferences";
import { useTranslation } from "@/i18n";
import { hasRealBackend } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth";

/**
 * "Lembretes e sugestões" — sugestões perto do almoço/jantar, pedir
 * avaliação depois de um pedido e "temos saudades suas" (backend
 * EngagementNotifier). Preferência da CONTA (API), não do browser: o envio
 * é feito pelo servidor. O lembrete de reserva continua a sair (é serviço).
 */
export function EngagementToggle() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!hasRealBackend || !token) return;
    fetchApiPreferences(token)
      .then((prefs) => setEnabled(prefs.engagementNotifications))
      .catch(() => setEnabled(true));
  }, []);

  if (!hasRealBackend) return null;

  const onChange = async (value: boolean) => {
    const token = getAuthToken();
    if (!token) return;
    setEnabled(value);
    try {
      await updateApiPreferences({ engagement_notifications: value }, token);
    } catch {
      setEnabled(!value);
      toast.error(t("perfil.engagement.error"));
    }
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{t("perfil.engagement.label")}</p>
        <p className="text-xs text-muted-foreground">{t("perfil.engagement.description")}</p>
      </div>
      <Switch
        checked={enabled ?? true}
        disabled={enabled === null}
        onCheckedChange={onChange}
        aria-label={t("perfil.engagement.label")}
      />
    </div>
  );
}
