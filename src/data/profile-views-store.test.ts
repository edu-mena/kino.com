// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProfileViewers, recordProfileView } from "./profile-views-store";

describe("recordProfileView / getProfileViewers", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("regista a primeira visita de um visitante", () => {
    recordProfileView("rest-1", { key: "guest-a" });
    const viewers = getProfileViewers("rest-1");
    expect(viewers).toHaveLength(1);
    expect(viewers[0]).toMatchObject({ viewerKey: "guest-a", visits: 1 });
  });

  it("não soma outra visita para o mesmo visitante dentro da janela de sessão — o essencial do pedido: recarregar a página não infla a contagem", () => {
    recordProfileView("rest-1", { key: "guest-a" });
    recordProfileView("rest-1", { key: "guest-a" });
    recordProfileView("rest-1", { key: "guest-a" });
    const viewers = getProfileViewers("rest-1");
    expect(viewers).toHaveLength(1);
    expect(viewers[0]!.visits).toBe(1);
  });

  it("conta uma nova visita depois de a janela de sessão passar", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    recordProfileView("rest-1", { key: "guest-a" });

    vi.setSystemTime(new Date("2026-01-01T10:45:00.000Z")); // +45 min
    recordProfileView("rest-1", { key: "guest-a" });

    const viewers = getProfileViewers("rest-1");
    expect(viewers).toHaveLength(1);
    expect(viewers[0]!.visits).toBe(2);
  });

  it("trata visitantes diferentes como linhas separadas", () => {
    recordProfileView("rest-1", { key: "guest-a", name: "Ana" });
    recordProfileView("rest-1", { key: "guest-b" });
    const viewers = getProfileViewers("rest-1");
    expect(viewers).toHaveLength(2);
    expect(viewers.find((v) => v.viewerKey === "guest-a")?.viewerName).toBe("Ana");
    expect(viewers.find((v) => v.viewerKey === "guest-b")?.viewerName).toBeUndefined();
  });

  it("não mistura visitas de restaurantes diferentes", () => {
    recordProfileView("rest-1", { key: "guest-a" });
    recordProfileView("rest-2", { key: "guest-a" });
    expect(getProfileViewers("rest-1")).toHaveLength(1);
    expect(getProfileViewers("rest-2")).toHaveLength(1);
  });

  it("não regista o próprio gestor a ver o seu restaurante", () => {
    localStorage.setItem("kino_admin_restaurant", "rest-1");
    recordProfileView("rest-1", { key: "guest-a" });
    expect(getProfileViewers("rest-1")).toHaveLength(0);
  });

  it("devolve mais recentes primeiro", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
    recordProfileView("rest-1", { key: "guest-a" });
    vi.setSystemTime(new Date("2026-01-02T10:00:00.000Z"));
    recordProfileView("rest-1", { key: "guest-b" });

    const viewers = getProfileViewers("rest-1");
    expect(viewers.map((v) => v.viewerKey)).toEqual(["guest-b", "guest-a"]);
  });
});
