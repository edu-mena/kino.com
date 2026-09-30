import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, withSecurityHeaders } from "@/lib/security-headers";

const env = {
  apiBaseUrl: "https://api.luku.ao/api/v1",
  reverbHost: "luku-api.fly.dev",
  reverbPort: "6001",
  reverbScheme: "https",
};

describe("security headers", () => {
  it("adiciona os cabeçalhos sem perder status nem os existentes", async () => {
    const original = new Response("<html></html>", {
      status: 404,
      headers: { "content-type": "text/html" },
    });

    const res = withSecurityHeaders(original, env);

    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toBe("text/html");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=");
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(await res.text()).toBe("<html></html>");
  });

  it("não sobrepõe um cabeçalho que a rota já definiu", () => {
    const original = new Response("", { headers: { "Referrer-Policy": "no-referrer" } });

    expect(withSecurityHeaders(original, env).headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("a CSP completa inclui a origem da API e do websocket, derivadas do ambiente", () => {
    const csp = contentSecurityPolicy(env);

    expect(csp).toContain("https://api.luku.ao");
    expect(csp).not.toContain("/api/v1");
    expect(csp).toContain("wss://luku-api.fly.dev:6001");
    expect(csp).toContain("object-src 'none'");
  });

  it("sem variáveis de ambiente não gera origens inválidas", () => {
    const csp = contentSecurityPolicy({});

    expect(csp).toContain("connect-src 'self' https://photon.komoot.io");
    expect(csp).not.toContain("null");
    expect(csp).not.toContain("undefined");
  });
});
