import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationList } from "@/components/notification-list";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { viewerKey } from "@/lib/customer";
import { playNotificationSound } from "@/lib/notification-sound";
import { scopeNotifications, useNotifications } from "@/lib/notifications";

const BELL_CAP = 12;

/**
 * Sino de notificações — atalho rápido: só mostra as NÃO lidas (até
 * `BELL_CAP`), e ao fechar marca essas mesmas como lidas, então desaparecem
 * da próxima abertura. O histórico completo (lidas + não lidas) fica na
 * página `/notificacoes` (cliente) ou `/admin/notificacoes` (painel),
 * apontada pelo rodapé.
 *
 * `scope="client"` filtra pelo `ownerKey` de quem está a ver; `scope="restaurant"`
 * filtra pelo `restaurantId` do painel — que vem por prop, para o sino não
 * depender de `useRestaurantAdmin` (esse provider só existe dentro dos
 * layouts `/admin` e `/sistema`, e o sino também é usado na casca do cliente).
 */
export function NotificationsBell({
  scope,
  restaurantId,
}: {
  scope: "client" | "restaurant";
  restaurantId?: string;
}) {
  const { all, markManyRead } = useNotifications();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const shownIds = useRef<string[]>([]);

  const unread = useMemo(() => {
    const mineKey = viewerKey(user);
    return scopeNotifications(all, scope, {
      ...(restaurantId ? { restaurantId } : {}),
      ownerKey: mineKey,
    }).filter((n) => !n.read);
  }, [all, scope, restaurantId, user]);

  // Som característico (Fase N4) — só nas notificações que aparecem DEPOIS
  // da primeira leitura desta aba (nunca no lote inicial já não-lido ao
  // carregar a página, senão tocava sempre que o utilizador tivesse
  // notificações antigas por ler).
  const knownIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const idsNow = new Set(unread.map((n) => n.id));
    if (knownIds.current) {
      let hasNew = false;
      for (const id of idsNow) {
        if (!knownIds.current.has(id)) {
          hasNew = true;
          break;
        }
      }
      if (hasNew) playNotificationSound();
    }
    knownIds.current = idsNow;
  }, [unread]);

  const list = unread.slice(0, BELL_CAP);
  const historyHref = scope === "restaurant" ? "/admin/notificacoes" : "/notificacoes";

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          shownIds.current = list.map((n) => n.id);
        } else if (shownIds.current.length > 0) {
          markManyRead(shownIds.current);
          shownIds.current = [];
        }
      }}
    >
      <DropdownMenuTrigger
        aria-label={t("notifications.aria")}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-foreground transition-colors hover:border-primary"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-2.5">
          <p className="text-sm font-bold text-foreground">{t("notifications.title")}</p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <NotificationList
            items={list}
            scope={scope}
            emptyText={t("notifications.empty")}
            onNavigate={() => setOpen(false)}
          />
        </div>
        <Link
          to={historyHref}
          onClick={() => setOpen(false)}
          className="block border-t border-border px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-surface"
        >
          {t("notifications.seeAll")}
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
