/**
 * Endereço PÚBLICO do site — o que vai dentro de links partilhados e,
 * sobretudo, dos QR codes impressos (cardápio na mesa/montra), que têm de
 * abrir em qualquer telemóvel durante anos.
 *
 * `VITE_PUBLIC_BASE_URL` existe para testar em dev pela rede local (o QR
 * aponta para o IP desta máquina, ex.: http://192.168.1.194:8081). Em
 * produção, um endereço privado ou `localhost` nunca pode ir parar a um QR:
 * se a variável vier assim no build (copiada do `.env.example`, p.ex.),
 * cai-se para a origem da página e, no limite, para o domínio oficial.
 */

export const CANONICAL_SITE_URL = "https://luku.ao";

/** localhost, IPs privados (10/8, 172.16/12, 192.168/16), link-local, `.local`. */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h === "::1") {
    return true;
  }
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

/** Origem pública utilizável num link para outras pessoas: http(s), não
 * privada. Devolve a origem normalizada (sem barra final) ou `null`. */
function publicOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (isPrivateHost(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolvePublicBaseUrl({
  envBase,
  origin,
  isDev,
}: {
  envBase: string | undefined;
  origin: string | undefined;
  isDev: boolean;
}): string {
  // Dev: vale tudo o que foi configurado (é para isso que a variável existe).
  if (isDev) return (envBase || origin || CANONICAL_SITE_URL).replace(/\/$/, "");
  return publicOrigin(envBase) ?? publicOrigin(origin) ?? CANONICAL_SITE_URL;
}

/** Base pública para links/QR, já resolvida para o ambiente atual. */
export function publicSiteBaseUrl(): string {
  return resolvePublicBaseUrl({
    envBase: import.meta.env["VITE_PUBLIC_BASE_URL"] as string | undefined,
    origin: typeof window !== "undefined" ? window.location.origin : undefined,
    isDev: import.meta.env.DEV,
  });
}
