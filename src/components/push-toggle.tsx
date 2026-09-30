import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/i18n";
import { openAppSettings } from "@/lib/native-permissions";
import { usePushSubscription, type PushScope } from "@/lib/push-notifications";
import { cn } from "@/lib/utils";

/**
 * Interruptor "Notificações no telemóvel/browser" (push com a app fechada) —
 * o mesmo para o cliente (`/perfil`) e para o painel do restaurante
 * (`/admin/notificacoes`), cada um registado na sua conta (`scope`).
 *
 * Na app nativa com a permissão já negada, o SO não volta a perguntar: o
 * toque abre as definições da app para a ativar lá.
 */
export function PushToggle({
  token,
  scope,
  className,
}: {
  token: string | null;
  scope: PushScope;
  className?: string;
}) {
  const { t } = useTranslation();
  const push = usePushSubscription(token, scope);
  const blockedNative = push.native && push.permission === "denied";

  if (!push.supported) return null;

  const onToggle = async (checked: boolean) => {
    if (checked && blockedNative) {
      void openAppSettings();
      return;
    }
    try {
      if (checked) {
        const result = await push.subscribe();
        if (result === "denied") {
          toast.error(t("perfil.pushDeniedError"));
          return;
        }
        if (result === "granted") toast.success(t("perfil.pushEnabledToast"));
      } else {
        await push.unsubscribe();
        toast.success(t("perfil.pushDisabledToast"));
      }
    } catch {
      toast.error(t("perfil.pushError"));
    }
  };

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{t("perfil.pushLabel")}</p>
        <p className="text-xs text-muted-foreground">
          {blockedNative
            ? t("perfil.pushDeniedNativeHint")
            : push.permission === "denied"
              ? t("perfil.pushDeniedHint")
              : t("perfil.pushDescription")}
        </p>
      </div>
      <Switch
        checked={push.subscribed}
        disabled={push.busy || (push.permission === "denied" && !blockedNative)}
        onCheckedChange={onToggle}
      />
    </div>
  );
}
