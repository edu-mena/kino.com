// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineBanner } from "@/components/offline-banner";
import { renderWithProviders, screen } from "@/test/render";

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => value });
}

describe("OfflineBanner", () => {
  afterEach(() => {
    setOnline(true);
    vi.useRealTimers();
  });

  it("não mostra nada com rede", () => {
    setOnline(true);
    renderWithProviders(<OfflineBanner />);

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("aparece quando a rede cai, avisa quando volta e depois desaparece", () => {
    vi.useFakeTimers();
    setOnline(true);
    renderWithProviders(<OfflineBanner />);

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByRole("status").textContent).toMatch(/sem ligação/i);

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.getByRole("status").textContent).toMatch(/restabelecida/i);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("já começa visível se a app abrir sem rede", () => {
    setOnline(false);
    renderWithProviders(<OfflineBanner />);

    expect(screen.getByRole("status").textContent).toMatch(/sem ligação/i);
  });
});
