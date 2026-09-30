/**
 * Cabeçalhos de segurança de todas as respostas do servidor SSR
 * (auditoria de segurança, Fase 5) — aplicados em `src/server.ts`, por isso
 * valem seja qual for o alojamento (antes: nenhum, além de um
 * `upgrade-insecure-requests` posto pela CDN).
 *
 * Duas CSPs em paralelo, de propósito:
 * - a APLICADA só tem o que não parte nada: impedir a app de ser embebida
 *   num iframe alheio (clickjacking), `<base>` e `<object>`;
 * - a completa vai em Report-Only: o browser só avisa na consola o que
 *   bloquearia. Passar a aplicada depois de uma ou duas semanas sem avisos
 *   em produção (ver o plano da auditoria) — a sessão vive em
 *   localStorage, por isso uma CSP a sério é a melhor defesa contra XSS.
 */

type Env = {
  apiBaseUrl?: string | undefined;
  reverbHost?: string | undefined;
  reverbPort?: string | undefined;
  reverbScheme?: string | undefined;
};

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy(env: Env): string {
  const api = originOf(env.apiBaseUrl);
  const reverb = env.reverbHost
    ? `${env.reverbScheme === "https" ? "wss" : "ws"}://${env.reverbHost}${env.reverbPort ? `:${env.reverbPort}` : ""}`
    : null;

  const connect = [
    "'self'",
    api,
    reverb,
    // Mapas (geocoding/rotas diretos quando não passam pelo proxy da API).
    "https://photon.komoot.io",
    "https://router.project-osrm.org",
    "https://accounts.google.com",
    "https://*.googleapis.com",
  ].filter(Boolean);

  return [
    "default-src 'self'",
    // 'unsafe-inline': o SSR do TanStack injeta scripts inline de hidratação
    // sem nonce. Continua a bloquear scripts de qualquer outra origem.
    "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    // Fotos de restaurantes/pratos vêm de muitos domínios (links colados
    // pelos próprios restaurantes, dados de demonstração) — só https.
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    `connect-src ${connect.join(" ")}`,
    "frame-src https://accounts.google.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function securityHeaders(env: Env): Record<string, string> {
  return {
    "Strict-Transport-Security": "max-age=31536000",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Geolocalização só para a própria app (morada/distância); o resto nunca
    // é usado no browser (a câmara da app nativa é o plugin Capacitor).
    "Permissions-Policy":
      "geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()",
    "Content-Security-Policy": "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
    "Content-Security-Policy-Report-Only": contentSecurityPolicy(env),
  };
}

/** Devolve uma cópia da resposta com os cabeçalhos acima (os headers de uma
 * Response podem ser imutáveis — nunca se alteram no lugar). */
export function withSecurityHeaders(response: Response, env: Env): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders(env))) {
    if (!headers.has(name)) headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
