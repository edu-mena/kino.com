import { describe, expect, it } from "vitest";
import { CANONICAL_SITE_URL, isPrivateHost, resolvePublicBaseUrl } from "@/lib/public-url";

describe("resolvePublicBaseUrl (link dos QR do cardápio)", () => {
  it("em produção, ignora um VITE_PUBLIC_BASE_URL de rede local e usa a origem pública", () => {
    expect(
      resolvePublicBaseUrl({
        envBase: "http://192.168.1.194:8081",
        origin: "https://luku.ao",
        isDev: false,
      }),
    ).toBe("https://luku.ao");
  });

  it("em produção, usa o VITE_PUBLIC_BASE_URL quando é público (domínio oficial)", () => {
    expect(
      resolvePublicBaseUrl({
        envBase: "https://luku.ao/",
        origin: "https://preview.example.com",
        isDev: false,
      }),
    ).toBe("https://luku.ao");
  });

  it("nunca devolve localhost — dentro da app nativa a origem pode ser https://localhost", () => {
    expect(
      resolvePublicBaseUrl({ envBase: undefined, origin: "https://localhost", isDev: false }),
    ).toBe(CANONICAL_SITE_URL);
    expect(
      resolvePublicBaseUrl({ envBase: undefined, origin: "capacitor://localhost", isDev: false }),
    ).toBe(CANONICAL_SITE_URL);
  });

  it("em dev, respeita o IP da rede local (para ler o QR com o telemóvel)", () => {
    expect(
      resolvePublicBaseUrl({
        envBase: "http://192.168.1.194:8081/",
        origin: "http://localhost:8081",
        isDev: true,
      }),
    ).toBe("http://192.168.1.194:8081");
  });

  it("deteta endereços privados", () => {
    for (const host of [
      "localhost",
      "127.0.0.1",
      "10.0.0.5",
      "172.20.1.1",
      "192.168.0.1",
      "pc.local",
    ]) {
      expect(isPrivateHost(host)).toBe(true);
    }
    for (const host of ["luku.ao", "172.32.0.1", "8.8.8.8", "api.luku.ao"]) {
      expect(isPrivateHost(host)).toBe(false);
    }
  });
});
