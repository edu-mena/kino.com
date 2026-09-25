import { useNavigate } from "@tanstack/react-router";
import { Bell, BellOff, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";
import { useFollows } from "@/lib/follows";

type Props = {
  restaurantId: string;
  restaurantName: string;
  /** Contagem que veio com o restaurante (backend real, só no detalhe). */
  initialFollowersCount?: number | undefined;
};

/** Hook partilhado pelas duas variantes — decide o que fazer ao clicar,
 * incluindo levar o convidado a entrar (seguir exige conta). */
function useFollowAction(restaurantId: string, restaurantName: string) {
  const { isFollowing, isNotifying, toggleFollow, setNotify } = useFollows();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const following = isFollowing(restaurantId);
  const notifying = isNotifying(restaurantId);

  const onToggle = () => {
    const result = toggleFollow(restaurantId);
    if (result === "login") {
      toast(t("follow.loginToast"));
      void navigate({ to: "/entrar" });
      return;
    }
    toast(
      t(following ? "follow.unfollowedToast" : "follow.followedToast", { name: restaurantName }),
    );
  };

  const onToggleNotify = () => {
    setNotify(restaurantId, !notifying);
    toast(
      t(notifying ? "follow.notifyOffToast" : "follow.notifyOnToast", { name: restaurantName }),
    );
  };

  return { following, notifying, onToggle, onToggleNotify, t };
}

/** Botão redondo por cima do cartão de restaurante (onde antes estava o
 * coração dos favoritos). */
export function FollowIconButton({ restaurantId, restaurantName }: Props) {
  const { following, onToggle, t } = useFollowAction(restaurantId, restaurantName);
  const Icon = following ? UserCheck : UserPlus;

  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={t(following ? "follow.unfollowAria" : "follow.followAria", {
        name: restaurantName,
      })}
      title={t(following ? "follow.following" : "follow.follow")}
      onClick={(e) => {
        e.preventDefault();
        onToggle();
      }}
      className={`absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full backdrop-blur transition-colors ${
        following
          ? "bg-brand text-brand-foreground"
          : "bg-background/80 text-muted-foreground hover:text-brand"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** Página do restaurante: "Seguir"/"A seguir", sino por restaurante e nº de
 * seguidores. */
export function FollowBar({ restaurantId, restaurantName, initialFollowersCount }: Props) {
  const { followersCount } = useFollows();
  const { following, notifying, onToggle, onToggleNotify, t } = useFollowAction(
    restaurantId,
    restaurantName,
  );
  const count = followersCount(restaurantId, initialFollowersCount);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={following}
        aria-label={t(following ? "follow.unfollowAria" : "follow.followAria", {
          name: restaurantName,
        })}
        onClick={onToggle}
        className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
          following
            ? "border border-primary text-primary hover:bg-primary/5"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        {t(following ? "follow.following" : "follow.follow")}
      </button>
      {following && (
        <button
          type="button"
          aria-pressed={notifying}
          aria-label={t(notifying ? "follow.notifyOnAria" : "follow.notifyOffAria", {
            name: restaurantName,
          })}
          onClick={onToggleNotify}
          className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {notifying ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </button>
      )}
      {count != null && count > 0 && (
        <span className="text-xs text-muted-foreground">
          {count === 1 ? t("follow.followersOne") : t("follow.followersMany", { count })}
        </span>
      )}
    </div>
  );
}
