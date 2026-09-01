import { describe, expect, it } from "vitest";
import { computeAccess } from "./subscriptions";
import type { RestaurantSubscription } from "@/data/subscriptions-store";

const DAY = 86_400_000;
function makeSub(over: Partial<RestaurantSubscription>): RestaurantSubscription {
  return {
    restaurantId: "rest-1",
    plan: "basico",
    startedAt: new Date().toISOString(),
    trialEndsAt: new Date(Date.now() + 10 * DAY).toISOString(),
    status: "trial",
    ...over,
  };
}

describe("computeAccess", () => {
  it("sem subscrição: desconhecido, nunca bloqueia", () => {
    const access = computeAccess(undefined);
    expect(access.status).toBe("unknown");
    expect(access.locked).toBe(false);
  });

  it("suspensa bloqueia o painel", () => {
    const access = computeAccess(makeSub({ status: "suspended" }));
    expect(access.locked).toBe(true);
    expect(access.warning).toBe(false);
  });

  it("em atraso avisa mas não bloqueia", () => {
    const access = computeAccess(makeSub({ status: "overdue" }));
    expect(access.locked).toBe(false);
    expect(access.warning).toBe(true);
  });

  it("em trial calcula os dias restantes", () => {
    const access = computeAccess(
      makeSub({ status: "trial", trialEndsAt: new Date(Date.now() + 5 * DAY).toISOString() }),
    );
    expect(access.trialDaysLeft).toBeGreaterThanOrEqual(4);
    expect(access.trialDaysLeft).toBeLessThanOrEqual(5);
  });

  it("ativa não tem dias de trial", () => {
    const access = computeAccess(makeSub({ status: "active" }));
    expect(access.trialDaysLeft).toBe(0);
    expect(access.locked).toBe(false);
    expect(access.warning).toBe(false);
  });
});
