import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { fetchApiPreferences, updateApiPreferences } from "@/data/api-preferences";
import { useTranslation } from "@/i18n";
import { hasRealBackend } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth";

/**
 * "Mostrar o meu nome aos restaurantes que visito" — sem isto (omissão), um
 * restaurante vê em "Quem viu o seu perfil" só "cliente Luku", nunca o nome,
 * a menos que o siga (auditoria de segurança, Fase 4; backend
 * ProfileViewController::index). Lido/gravado direto na API: é uma
 * preferência da conta, não do browser.
 */
export function ProfileVisitPrivacy() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!hasRealBackend || !token) return;
    fetchApiPreferences(token)
      .then((prefs) => setEnabled(prefs.shareNameOnProfileVisits))
      .catch(() => setEnabled(false));
  }, []);

  if (!hasRealBackend) return null;

  const onChange = async (value: boolean) => {
    const token = getAuthToken();
    if (!token) return;
    setEnabled(value);
    try {
      await updateApiPreferences({ share_name_on_profile_visits: value }, token);
    } catch {
      setEnabled(!value);
      toast.error(t("perfil.profileVisits.error"));
    }
  };

  return (
    <label className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-surface">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-primary">
        <Eye className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{t("perfil.profileVisits.label")}</span>
        <span className="block text-xs text-muted-foreground">
          {t("perfil.profileVisits.description")}
        </span>
      </span>
      <Switch
        checked={enabled ?? false}
        disabled={enabled === null}
        onCheckedChange={onChange}
        aria-label={t("perfil.profileVisits.label")}
      />
    </label>
  );
}
