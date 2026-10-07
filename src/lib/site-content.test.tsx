// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-client")>()),
  hasRealBackend: true,
}));
vi.mock("@/lib/preferences", () => ({ usePreferences: () => ({ language: "pt" }) }));

const fetchApiSiteContent = vi.fn();
vi.mock("@/data/api-site-content", () => ({
  fetchApiSiteContent: () => fetchApiSiteContent(),
  fetchApiSiteStats: vi.fn(),
}));

const { useGuestContent } = await import("./site-content");

const settings = {
  contactEmail: null,
  contactPhone: null,
  contactAddress: null,
  contactWhatsapp: null,
  aboutEyebrow: null,
  aboutTitle: null,
  aboutDescription: null,
  aboutHeroImageUrl: null,
  aboutHeroMediaType: "image",
  aboutHeroThumbnailUrl: null,
  processingStatus: "ready",
  guestContent: {
    texts: { "luku.bentoTitle": "Título editado", "luku.seeMenu": "   " },
    media: { "luku.heroImage": "https://cdn.luku.com/site/x/hero.jpg" },
  },
  lukuVideoUrl: "https://cdn.luku.com/site/1/video.mp4",
  lukuVideoPosterUrl: "https://cdn.luku.com/site/1/poster.jpg",
  lukuVideoStatus: "ready",
};

describe("useGuestContent", () => {
  it("o texto editado substitui o original; sem edição (ou só espaços) fica a tradução", async () => {
    fetchApiSiteContent.mockResolvedValue({ settings, team: [], testimonials: [], faqs: [] });

    const { result } = renderHook(() => useGuestContent());
    await waitFor(() => expect(result.current.text("luku.bentoTitle")).toBe("Título editado"));

    expect(result.current.text("luku.seeMenu")).toBe("Ver cardápio");
    expect(result.current.text("luku.featuresTitle")).toBe("Funcionalidades");
    expect(result.current.media("luku.heroImage", "/original.webp")).toBe(
      "https://cdn.luku.com/site/x/hero.jpg",
    );
    expect(result.current.media("luku.illustration1Image", "/date.png")).toBe("/date.png");
    expect(result.current.lukuVideo).toEqual({
      src: "https://cdn.luku.com/site/1/video.mp4",
      poster: "https://cdn.luku.com/site/1/poster.jpg",
    });
    // Cópia no aparelho para a próxima visita mostrar logo a versão editada.
    expect(window.localStorage.getItem("luku_site_content_v1")).toContain("Título editado");
  });
});
