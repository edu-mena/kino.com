import { apiFetch } from "@/lib/api-client";

/**
 * Moderação de conteúdo (App Store 1.2) — backend ContentReportController /
 * UserBlockController. Denunciar funciona sem sessão (convidados também veem
 * avaliações e stories); bloquear e a fila de moderação exigem sessão.
 */

export type ReportableType = "review" | "story" | "offer";
export type ReportReason = "offensive" | "spam" | "false_info" | "other";
export const REPORT_REASONS: ReportReason[] = ["offensive", "spam", "false_info", "other"];

export async function reportContent(
  type: ReportableType,
  contentId: string,
  input: { reason: ReportReason; details: string },
  token: string | null,
): Promise<void> {
  await apiFetch(`/reports/${type}/${contentId}`, {
    method: "POST",
    token,
    body: { reason: input.reason, details: input.details.trim() || null },
  });
}

export async function blockReviewAuthor(reviewId: string, token: string): Promise<void> {
  await apiFetch(`/reviews/${reviewId}/block-author`, { method: "POST", token });
}

export type BlockedUser = { id: string; name: string | null; blockedAt: string };

export async function fetchBlockedUsers(token: string): Promise<BlockedUser[]> {
  const { data } = await apiFetch<{ data: BlockedUser[] }>("/me/blocks", { token });
  return data;
}

export async function unblockUser(blockId: string, token: string): Promise<void> {
  await apiFetch(`/me/blocks/${blockId}`, { method: "DELETE", token });
}

export type ModerationItem = {
  type: ReportableType;
  contentId: string;
  preview: {
    restaurant: string | null;
    author?: string;
    rating?: number;
    text: string | null;
    reply?: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
  };
  reportsCount: number;
  reasons: Partial<Record<ReportReason, number>>;
  details: string[];
  firstReportedAt: string;
  hidden: boolean;
};

export async function fetchModerationQueue(token: string): Promise<ModerationItem[]> {
  const { data } = await apiFetch<{ data: ModerationItem[] }>("/content-reports", { token });
  return data;
}

export async function resolveReport(
  type: ReportableType,
  contentId: string,
  action: "remove" | "dismiss",
  token: string,
): Promise<void> {
  await apiFetch(`/content-reports/${type}/${contentId}/resolve`, {
    method: "POST",
    token,
    body: { action },
  });
}
