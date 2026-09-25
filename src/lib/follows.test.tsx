// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  user: null as null | { id: string; name: string; email: string },
  isLoggedIn: false,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => authState,
  getAuthToken: () => null,
}));
vi.mock("@/lib/api-client", () => ({ hasRealBackend: false }));

import { FollowsProvider, getStoredFollows, useFollows } from "./follows";

const wrapper = ({ children }: { children: ReactNode }) => (
  <FollowsProvider>{children}</FollowsProvider>
);

describe("FollowsProvider (demo)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    authState.user = null;
    authState.isLoggedIn = false;
  });

  it("convidado não segue — pede login", () => {
    const { result } = renderHook(() => useFollows(), { wrapper });
    let outcome = "";
    act(() => {
      outcome = result.current.toggleFollow("r1");
    });
    expect(outcome).toBe("login");
    expect(result.current.isFollowing("r1")).toBe(false);
  });

  it("conta segue, desliga o sino e deixa de seguir", () => {
    authState.user = { id: "u1", name: "Ana", email: "ana@example.com" };
    authState.isLoggedIn = true;
    const { result } = renderHook(() => useFollows(), { wrapper });

    act(() => {
      result.current.toggleFollow("r1");
    });
    expect(result.current.isFollowing("r1")).toBe(true);
    expect(result.current.isNotifying("r1")).toBe(true);
    expect(result.current.followersCount("r1")).toBe(1);

    act(() => result.current.setNotify("r1", false));
    expect(result.current.isFollowing("r1")).toBe(true);
    expect(result.current.isNotifying("r1")).toBe(false);

    act(() => {
      result.current.toggleFollow("r1");
    });
    expect(result.current.isFollowing("r1")).toBe(false);
    expect(getStoredFollows()).toHaveLength(0);
  });

  it("favoritos de restaurante antigos passam a seguir no login", () => {
    window.localStorage.setItem(
      "luku_preferences",
      JSON.stringify({ favoriteRestaurantIds: ["r1", "r2"], favoriteDishIds: ["d1"] }),
    );
    authState.user = { id: "u1", name: "Ana", email: "ana@example.com" };
    authState.isLoggedIn = true;

    const { result } = renderHook(() => useFollows(), { wrapper });

    expect(result.current.follows.map((f) => f.restaurantId).sort()).toEqual(["r1", "r2"]);
    const prefs = JSON.parse(window.localStorage.getItem("luku_preferences") ?? "{}");
    expect(prefs.favoriteRestaurantIds).toBeUndefined();
    expect(prefs.favoriteDishIds).toEqual(["d1"]);
  });
});
