import { Ban } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchBlockedUsers, unblockUser, type BlockedUser } from "@/data/api-moderation";
import { useTranslation } from "@/i18n";
import { hasRealBackend } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth";

/** Pessoas que o cliente bloqueou (ReviewActionsMenu) — só aparece se houver
 * alguma; desbloquear volta a mostrar as avaliações delas. */
export function BlockedUsers() {
  const { t } = useTranslation();
  const [blocks, setBlocks] = useState<BlockedUser[]>([]);

  useEffect(() => {
    const token = getAuthToken();
    if (!hasRealBackend || !token) return;
    fetchBlockedUsers(token)
      .then(setBlocks)
      .catch(() => setBlocks([]));
  }, []);

  if (blocks.length === 0) return null;

  const unblock = async (block: BlockedUser) => {
    const token = getAuthToken();
    if (!token) return;
    try {
      await unblockUser(block.id, token);
      setBlocks((prev) => prev.filter((b) => b.id !== block.id));
      toast.success(t("moderation.unblocked", { name: block.name ?? "" }));
    } catch {
      toast.error(t("moderation.blockError"));
    }
  };

  return (
    <div className="p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Ban className="h-4 w-4 text-muted-foreground" /> {t("moderation.blockedTitle")}
      </p>
      <ul className="mt-2 divide-y divide-border">
        {blocks.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="truncate">{b.name ?? t("moderation.deletedUser")}</span>
            <button
              type="button"
              onClick={() => unblock(b)}
              className="shrink-0 text-xs font-semibold text-primary hover:underline"
            >
              {t("moderation.unblock")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
