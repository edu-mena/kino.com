import { describe, expect, it } from "vitest";
import {
  INVITE_DECLINE_COOLDOWN_DAYS,
  INVITE_RESEND_DAYS,
  INVITES_DAILY_CAP,
  inviteBlockReason,
} from "./follow-invites";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-10-10T12:00:00Z");
const daysAgo = (d: number) => new Date(now - d * DAY).toISOString();
const base = { isGuest: false, following: false, invite: undefined, sentToday: 0, now };

describe("regras anti-spam do convite siga-nos", () => {
  it("pode convidar quem tem conta e ainda não foi convidado", () => {
    expect(inviteBlockReason(base)).toBeNull();
  });

  it("convidado sem conta e quem já segue não", () => {
    expect(inviteBlockReason({ ...base, isGuest: true })).toBe("guest");
    expect(inviteBlockReason({ ...base, following: true })).toBe("following");
  });

  it("um convite a cada 30 dias", () => {
    const invite = {
      restaurantId: "r",
      ownerKey: "a",
      lastSentAt: daysAgo(INVITE_RESEND_DAYS - 1),
    };
    expect(inviteBlockReason({ ...base, invite })).toBe("recent");
    expect(
      inviteBlockReason({
        ...base,
        invite: { ...invite, lastSentAt: daysAgo(INVITE_RESEND_DAYS + 1) },
      }),
    ).toBeNull();
  });

  it("'Agora não' espera 90 dias; silenciar é para sempre", () => {
    const declined = {
      restaurantId: "r",
      ownerKey: "a",
      lastSentAt: daysAgo(60),
      declinedAt: daysAgo(INVITE_DECLINE_COOLDOWN_DAYS - 1),
    };
    expect(inviteBlockReason({ ...base, invite: declined })).toBe("declined");
    expect(
      inviteBlockReason({
        ...base,
        invite: { ...declined, lastSentAt: daysAgo(400), declinedAt: daysAgo(400) },
      }),
    ).toBeNull();
    expect(
      inviteBlockReason({
        ...base,
        invite: { restaurantId: "r", ownerKey: "a", mutedAt: daysAgo(1000) },
      }),
    ).toBe("muted");
  });

  it("limite diário por restaurante", () => {
    expect(inviteBlockReason({ ...base, sentToday: INVITES_DAILY_CAP })).toBe("daily_cap");
  });
});
