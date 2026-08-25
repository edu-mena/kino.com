import { Lightbulb, X } from "lucide-react";
import { useTranslation } from "@/i18n";

/** Banner discreto dentro de um diálogo de criação, só na primeira vez —
 * ver `useFirstUseHint`. */
export function FirstUseHint({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2 rounded-xl bg-brand/10 p-3 text-xs text-foreground">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
      <p className="flex-1">{text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("firstUseHint.dismissAria")}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
