import { describe, expect, it } from "vitest";
import { scopeNotifications, type LukuNotification } from "./notifications";

const note = (over: Partial<LukuNotification>): LukuNotification => ({
  id: "n1",
  kind: "order",
  refId: "o1",
  restaurantId: "r1",
  event: "orderNew",
  status: "pending",
  at: "2026-09-30T10:00:00Z",
  read: false,
  ...over,
});

describe("scopeNotifications", () => {
  it("ação própria fica no histórico mas já lida (não conta nem toca)", () => {
    const all = [
      note({ id: "c", ownerKey: "u1", audience: "client", actor: "customer" }),
      note({ id: "r", audience: "restaurant", actor: "customer" }),
    ];
    const client = scopeNotifications(all, "client", { ownerKey: "u1" });
    const restaurant = scopeNotifications(all, "restaurant", { restaurantId: "r1" });

    expect(client).toHaveLength(1);
    expect(client[0]).toMatchObject({ id: "c", read: true }); // o cliente criou: não é novidade
    expect(restaurant).toHaveLength(1);
    expect(restaurant[0]).toMatchObject({ id: "r", read: false }); // o restaurante tem novidade
  });

  it("cada lado só vê a sua cópia do evento", () => {
    const all = [
      note({ id: "c", ownerKey: "u1", audience: "client", actor: "restaurant" }),
      note({ id: "r", ownerKey: "u1", audience: "restaurant", actor: "restaurant" }),
    ];
    expect(scopeNotifications(all, "client", { ownerKey: "u1" }).map((n) => n.id)).toEqual(["c"]);
    expect(scopeNotifications(all, "restaurant", { restaurantId: "r1" }).map((n) => n.id)).toEqual([
      "r",
    ]);
  });

  it("notificações antigas (sem audience/actor) continuam como antes", () => {
    const all = [note({ id: "old", ownerKey: "u1" })];
    expect(scopeNotifications(all, "client", { ownerKey: "u1" })[0]?.read).toBe(false);
    expect(scopeNotifications(all, "restaurant", { restaurantId: "r1" })[0]?.read).toBe(false);
  });
});
