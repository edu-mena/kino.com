import { safeLocalStorageSet } from "@/data/safe-storage";
import { CHANGE_EVENT } from "@/data/storage-keys";

/**
 * Convite "siga-nos" que o restaurante manda a quem viu o perfil. As regras
 * anti-spam espelham backend/app/Services/FollowInvitePolicy.php — o
 * servidor é quem decide com backend real; aqui servem o modo demo (e o
 * texto do motivo no painel, nos dois modos).
 */
export const INVITE_RESEND_DAYS = 30;
export const INVITE_DECLINE_COOLDOWN_DAYS = 90;
export const INVITES_DAILY_CAP = 30;

export type InviteBlockReason =
  "guest" | "following" | "muted" | "declined" | "recent" | "daily_cap";

export type StoredInvite = {
  restaurantId: string;
  ownerKey: string;
  lastSentAt?: string | undefined;
  declinedAt?: string | undefined;
  mutedAt?: string | undefined;
  acceptedAt?: string | undefined;
};

const KEY = "luku_follow_invites_v1";
const DAY_MS = 24 * 60 * 60 * 1000;

export function inviteBlockReason(opts: {
  isGuest: boolean;
  following: boolean;
  invite: StoredInvite | undefined;
  sentToday: number;
  now?: number;
}): InviteBlockReason | null {
  const now = opts.now ?? Date.now();
  const ago = (iso?: string) => (iso ? now - new Date(iso).getTime() : Infinity);
  if (opts.isGuest) return "guest";
  if (opts.following) return "following";
  if (opts.invite?.mutedAt) return "muted";
  if (ago(opts.invite?.declinedAt) < INVITE_DECLINE_COOLDOWN_DAYS * DAY_MS) return "declined";
  if (ago(opts.invite?.lastSentAt) < INVITE_RESEND_DAYS * DAY_MS) return "recent";
  if (opts.sentToday >= INVITES_DAILY_CAP) return "daily_cap";
  return null;
}

export function getStoredInvites(): StoredInvite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredInvite[]) : [];
  } catch {
    return [];
  }
}

function write(list: StoredInvite[]) {
  if (safeLocalStorageSet(KEY, JSON.stringify(list))) {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function upsert(restaurantId: string, ownerKey: string, patch: Partial<StoredInvite>) {
  const list = getStoredInvites();
  const idx = list.findIndex((i) => i.restaurantId === restaurantId && i.ownerKey === ownerKey);
  if (idx === -1) write([...list, { restaurantId, ownerKey, ...patch }]);
  else write(list.map((i, n) => (n === idx ? { ...i, ...patch } : i)));
}

export function mockInvitesSentToday(restaurantId: string, now = Date.now()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return getStoredInvites().filter(
    (i) =>
      i.restaurantId === restaurantId &&
      i.lastSentAt &&
      new Date(i.lastSentAt).getTime() >= start.getTime(),
  ).length;
}

export function sendMockInvite(restaurantId: string, ownerKey: string) {
  upsert(restaurantId, ownerKey, {
    lastSentAt: new Date().toISOString(),
    declinedAt: undefined,
    acceptedAt: undefined,
  });
}

export function declineMockInvite(restaurantId: string, ownerKey: string) {
  upsert(restaurantId, ownerKey, { declinedAt: new Date().toISOString() });
}

export function muteMockInvite(restaurantId: string, ownerKey: string) {
  upsert(restaurantId, ownerKey, { mutedAt: new Date().toISOString() });
}
