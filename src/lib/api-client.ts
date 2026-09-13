/**
 * Cliente HTTP genérico para a API REST real (backend/, ver plano de
 * backend) — usado pelos 3 fluxos de auth (cliente/restaurante/sistema) e,
 * progressivamente, pelas próximas entidades à medida que forem migradas do
 * mock. Sem backend implantado ainda, todo pedido feito com isto falha com
 * um erro de rede — comportamento esperado até haver deploy (ver plano,
 * Fase 2).
 */

const DEFAULT_BASE_URL = "http://localhost:8000/api/v1";

const RAW_BASE_URL = (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.trim();

/** false só quando `VITE_API_BASE_URL` não foi definida de todo — nunca em
 * dev (o `.env.example` já vem com ela preenchida para localhost) nem em
 * produção real (ver DEPLOY.md). Existe para a demo em `*.vercel.app`, que
 * publica o site sem nenhum backend por trás: consumido por `auth.tsx` para
 * desviar o login de cliente para uma sessão local fictícia em vez de deixar
 * `apiFetch` rebentar com erro de rede. */
export const hasRealBackend = Boolean(RAW_BASE_URL);

const API_BASE_URL = (RAW_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  /** Erros de validação por campo, no shape do Laravel (422). */
  errors?: Record<string, string[]> | undefined;

  constructor(status: number, message: string, errors?: Record<string, string[]> | undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  token?: string | null;
  /** Objeto -> JSON.stringify automático. FormData/string passa direto
   * (upload de ficheiros usa FormData, sem Content-Type manual). */
  body?: unknown;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, body, headers, ...rest } = options;

  const isFormData = body instanceof FormData;
  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string> | undefined),
  };

  const finalBody: BodyInit | null =
    body === undefined ? null : isFormData ? (body as FormData) : JSON.stringify(body);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: finalBody,
    });
  } catch {
    // Backend em baixo/inacessível (ver aviso no topo do ficheiro) — erro de
    // rede genérico, não um erro HTTP com status.
    throw new ApiError(0, "Não foi possível contactar o servidor. Tenta novamente.");
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (payload?.message as string | undefined) ?? "Ocorreu um erro. Tenta novamente.",
      payload?.errors as Record<string, string[]> | undefined,
    );
  }

  return payload as T;
}
