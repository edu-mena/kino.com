import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `VITE_IMAGE_CDN` é lido no topo do módulo, por isso cada caso re-importa
 * `image-cdn` com `vi.resetModules()` depois de mexer no env.
 */
async function load(provider?: string) {
  vi.resetModules();
  if (provider === undefined) {
    vi.stubEnv("VITE_IMAGE_CDN", "");
  } else {
    vi.stubEnv("VITE_IMAGE_CDN", provider);
  }
  return import("./image-cdn");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cdnUrl", () => {
  it("devolve a URL intacta sem provider", async () => {
    const { cdnUrl } = await load();
    expect(cdnUrl("https://example.com/a.jpg", { width: 400 })).toBe("https://example.com/a.jpg");
  });

  it("reescreve para wsrv.nl com largura e formato", async () => {
    const { cdnUrl } = await load("wsrv");
    const out = cdnUrl("https://example.com/a.jpg", { width: 400 });
    expect(out).toContain("https://wsrv.nl/?");
    expect(out).toContain("url=example.com%2Fa.jpg");
    expect(out).toContain("w=400");
    expect(out).toContain("output=webp");
  });

  it("não toca em assets locais nem data URIs", async () => {
    const { cdnUrl } = await load("wsrv");
    expect(cdnUrl("/assets/hero-abc.webp", { width: 400 })).toBe("/assets/hero-abc.webp");
    expect(cdnUrl("data:image/png;base64,iVBOR", { width: 400 })).toBe(
      "data:image/png;base64,iVBOR",
    );
  });
});

describe("cdnSrcSet", () => {
  it("devolve undefined sem provider", async () => {
    const { cdnSrcSet } = await load();
    expect(cdnSrcSet("https://example.com/a.jpg", [200, 400])).toBeUndefined();
  });

  it("gera descritores de largura ordenados", async () => {
    const { cdnSrcSet } = await load("wsrv");
    const out = cdnSrcSet("https://example.com/a.jpg", [400, 200]);
    expect(out).toMatch(/ 200w,.* 400w$/);
  });
});

describe("miniaturas dos uploads da app", () => {
  const upload =
    "https://luku-media.fly.storage.tigris.dev/dish/user-63/5f077fc0-6867-4479-a221-cae192ad73c1.jpg";
  const base =
    "https://luku-media.fly.storage.tigris.dev/dish/user-63/5f077fc0-6867-4479-a221-cae192ad73c1";

  it("escolhe a miniatura mais pequena que cobre a largura pedida", async () => {
    const { thumbnailUrl } = await load();
    expect(thumbnailUrl(upload, 64)).toBe(`${base}.w160.webp`);
    expect(thumbnailUrl(upload, 320)).toBe(`${base}.w480.webp`);
    expect(thumbnailUrl(upload, 900)).toBe(`${base}.w960.webp`);
    expect(thumbnailUrl(upload, 1200)).toBe(`${base}.w960.webp`);
  });

  it("links externos e assets locais não têm miniaturas", async () => {
    const { thumbnailUrl } = await load();
    expect(thumbnailUrl("https://images.unsplash.com/photo-1517248135467?w=1200", 400)).toBe(
      undefined,
    );
    expect(thumbnailUrl("/assets/hero-abc.webp", 400)).toBe(undefined);
  });

  it("usa as miniaturas mesmo sem proxy, e nunca as manda para o wsrv", async () => {
    for (const provider of [undefined, "wsrv"]) {
      const { cdnUrl, cdnSrcSet } = await load(provider);
      expect(cdnUrl(upload, { width: 400 })).toBe(`${base}.w480.webp`);
      expect(cdnSrcSet(upload, [160, 320])).toBe(
        `${base}.w160.webp 160w, ${base}.w480.webp 480w, ${base}.w960.webp 960w, ${upload} 1600w`,
      );
    }
  });

  it("sem largura pedida fica o original", async () => {
    const { cdnUrl } = await load();
    expect(cdnUrl(upload)).toBe(upload);
  });
});
