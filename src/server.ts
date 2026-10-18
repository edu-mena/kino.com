import "./lib/error-capture";

import * as startServerEntry from "@tanstack/react-start/server-entry";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { withSecurityHeaders } from "./lib/security-headers";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

// Import estático de propósito: com o `import()` dinâmico, o TanStack Start
// ≥1.168.61 + Rolldown partiam o servidor em dois ficheiros que se importam
// um ao outro, e em produção TODAS as páginas davam
// "TypeError: __exportAll is not a function" (incidente de 18/10/2026).
const serverEntry =
  (startServerEntry as { default?: ServerEntry }).default ??
  (startServerEntry as unknown as ServerEntry);

async function getServerEntry(): Promise<ServerEntry> {
  return serverEntry;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Cabeçalhos de segurança (auditoria de segurança, Fase 5) — só no build de
// produção: em dev o editor/pré-visualização embebe a app num iframe, que o
// `frame-ancestors 'none'` bloquearia.
const securityEnv = {
  apiBaseUrl: import.meta.env["VITE_API_BASE_URL"] as string | undefined,
  reverbHost: import.meta.env["VITE_REVERB_HOST"] as string | undefined,
  reverbPort: import.meta.env["VITE_REVERB_PORT"] as string | undefined,
  reverbScheme: import.meta.env["VITE_REVERB_SCHEME"] as string | undefined,
};
const secure = (response: Response) =>
  import.meta.env.PROD ? withSecurityHeaders(response, securityEnv) : response;

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return secure(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return secure(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
