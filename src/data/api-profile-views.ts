import { apiFetch } from "@/lib/api-client";
import type { InviteBlockReason } from "@/lib/follow-invites";

/** "Quem viu o seu perfil" + convite "siga-nos" —
 * backend/app/Http/Controllers/Api/V1/ProfileViewController.php. Só com
 * `hasRealBackend`. O restaurante recebe só o NOME de quem tem conta. */

export type ProfileViewsTotals = {
  total: number;
  today: number;
  week: number;
  prevWeek: number;
  newThisWeek: number;
};

export type ProfileViewerRow = {
  id: string;
  name: string | null;
  isGuest: boolean;
  visits: number;
  firstAt: string;
  lastAt: string;
  following: boolean;
  invite: {
    canInvite: boolean;
    blockReason: InviteBlockReason | null;
    lastSentAt: string | null;
  };
};

export type ProfileViewsSummary = {
  totals: ProfileViewsTotals;
  invitesLeftToday: number;
  viewers: ProfileViewerRow[];
};

export async function recordApiProfileView(
  restaurantId: string,
  opts: { token: string | null; visitorKey: string },
): Promise<void> {
  await apiFetch(`/restaurants/${restaurantId}/profile-views`, {
    method: "POST",
    token: opts.token,
    body: opts.token ? {} : { visitor_key: opts.visitorKey },
  });
}

export async function fetchApiProfileViews(
  restaurantId: string,
  token: string,
): Promise<ProfileViewsSummary> {
  const { data } = await apiFetch<{ data: ProfileViewsSummary }>(
    `/restaurants/${restaurantId}/profile-views`,
    { token },
  );
  return data;
}

export async function inviteApiProfileViewer(
  restaurantId: string,
  viewerId: string,
  token: string,
): Promise<{ invite: ProfileViewerRow["invite"]; invitesLeftToday: number }> {
  const { data } = await apiFetch<{
    data: { invite: ProfileViewerRow["invite"]; invitesLeftToday: number };
  }>(`/restaurants/${restaurantId}/profile-views/${viewerId}/invite`, { method: "POST", token });
  return data;
}

export async function declineApiFollowInvite(restaurantId: string, token: string): Promise<void> {
  await apiFetch(`/restaurants/${restaurantId}/follow-invite/decline`, { method: "POST", token });
}

export async function muteApiFollowInvites(restaurantId: string, token: string): Promise<void> {
  await apiFetch(`/restaurants/${restaurantId}/follow-invite/mute`, { method: "POST", token });
}
