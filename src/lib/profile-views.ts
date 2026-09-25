import { useCallback, useEffect, useState } from "react";
import {
  fetchApiProfileViews,
  inviteApiProfileViewer,
  recordApiProfileView,
  type ProfileViewerRow,
  type ProfileViewsSummary,
} from "@/data/api-profile-views";
import { getProfileViewers, recordProfileView } from "@/data/profile-views-store";
import { safeLocalStorageSet } from "@/data/safe-storage";
import { CHANGE_EVENT } from "@/data/storage-keys";
import { hasRealBackend } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth";
import { GUEST_KEY, viewerKey } from "@/lib/customer";
import {
  getStoredInvites,
  INVITES_DAILY_CAP,
  inviteBlockReason,
  mockInvitesSentToday,
  sendMockInvite,
} from "@/lib/follow-invites";
import { getStoredFollows } from "@/lib/follows";
import { getAdminToken } from "@/lib/restaurant-admin";

/**
 * "Quem viu o seu perfil" nos dois modos. Com backend real, as visitas
 * vivem no servidor (qualquer browser conta); sem ele (demo), continuam no
 * localStorage (@/data/profile-views-store). O restaurante vê só o nome de
 * quem tem conta — nunca contactos.
 */

const VISITOR_ID_KEY = "luku_visitor_id";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Id aleatório e estável deste browser — identifica um convidado como
 * visitante único sem saber quem é. */
function visitorId(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    safeLocalStorageSet(VISITOR_ID_KEY, id);
    return id;
  } catch {
    return "anon";
  }
}

export function recordRestaurantProfileView(
  restaurantId: string,
  user: {
    email?: string | undefined;
    phone?: string | undefined;
    name?: string | undefined;
  } | null,
) {
  if (!hasRealBackend) {
    recordProfileView(restaurantId, {
      key: viewerKey(user),
      ...(user?.name ? { name: user.name } : {}),
    });
    return;
  }
  void recordApiProfileView(restaurantId, {
    token: getAuthToken(),
    visitorKey: visitorId(),
  }).catch(() => {
    // best-effort — nunca atrapalha a página do restaurante
  });
}

const EMPTY: ProfileViewsSummary = {
  totals: { total: 0, today: 0, week: 0, prevWeek: 0, newThisWeek: 0 },
  invitesLeftToday: INVITES_DAILY_CAP,
  viewers: [],
};

/** Mesmo formato da API, calculado a partir do localStorage (demo). */
function mockSummary(restaurantId: string): ProfileViewsSummary {
  const now = Date.now();
  const viewers = getProfileViewers(restaurantId);
  const follows = getStoredFollows();
  const invites = getStoredInvites();
  const sentToday = mockInvitesSentToday(restaurantId, now);
  const since = (iso: string) => now - new Date(iso).getTime();

  return {
    totals: {
      total: viewers.length,
      today: viewers.filter((v) => since(v.lastAt) < DAY_MS).length,
      week: viewers.filter((v) => since(v.lastAt) < 7 * DAY_MS).length,
      prevWeek: viewers.filter(
        (v) => since(v.lastAt) >= 7 * DAY_MS && since(v.lastAt) < 14 * DAY_MS,
      ).length,
      newThisWeek: viewers.filter((v) => since(v.firstAt) < 7 * DAY_MS).length,
    },
    invitesLeftToday: Math.max(0, INVITES_DAILY_CAP - sentToday),
    viewers: viewers.map((v): ProfileViewerRow => {
      const isGuest = v.viewerKey === GUEST_KEY || !v.viewerName;
      const following = follows.some(
        (f) => f.restaurantId === restaurantId && f.ownerKey === v.viewerKey,
      );
      const invite = invites.find(
        (i) => i.restaurantId === restaurantId && i.ownerKey === v.viewerKey,
      );
      const blockReason = inviteBlockReason({ isGuest, following, invite, sentToday, now });
      return {
        id: v.viewerKey,
        name: isGuest ? null : (v.viewerName ?? null),
        isGuest,
        visits: v.visits,
        firstAt: v.firstAt,
        lastAt: v.lastAt,
        following,
        invite: {
          canInvite: blockReason === null,
          blockReason,
          lastSentAt: invite?.lastSentAt ?? null,
        },
      };
    }),
  };
}

export function useProfileViewsSummary(restaurantId: string | undefined) {
  const [summary, setSummary] = useState<ProfileViewsSummary>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!restaurantId) return;
    if (!hasRealBackend) {
      setSummary(mockSummary(restaurantId));
      setLoading(false);
      return;
    }
    const token = getAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchApiProfileViews(restaurantId, token)
      .then(setSummary)
      .catch(() => {
        // mantém o último estado conhecido
      })
      .finally(() => setLoading(false));
  }, [restaurantId]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
      window.removeEventListener("focus", onChange);
    };
  }, [refresh]);

  /** `true` = convite enviado. Em caso de recusa do servidor (regra
   * anti-spam entretanto aplicada), recarrega para mostrar o motivo. */
  const invite = useCallback(
    async (viewerId: string): Promise<boolean> => {
      if (!restaurantId) return false;
      if (!hasRealBackend) {
        const row = mockSummary(restaurantId).viewers.find((v) => v.id === viewerId);
        if (!row?.invite.canInvite) return false;
        sendMockInvite(restaurantId, viewerId);
        return true;
      }
      const token = getAdminToken();
      if (!token) return false;
      try {
        const res = await inviteApiProfileViewer(restaurantId, viewerId, token);
        setSummary((cur) => ({
          ...cur,
          invitesLeftToday: res.invitesLeftToday,
          viewers: cur.viewers.map((v) => (v.id === viewerId ? { ...v, invite: res.invite } : v)),
        }));
        return true;
      } catch {
        refresh();
        return false;
      }
    },
    [restaurantId, refresh],
  );

  return { summary, loading, invite, refresh };
}
