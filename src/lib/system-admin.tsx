import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";

/**
 * Sessão da área de administração de sistema (`/sistema/*`) — email+senha
 * real (ver plano: operadores só existem na BD via seed manual, nunca
 * self-signup, nunca hardcoded no código-fonte como antes). Independente de
 * `useAuth`/`useRestaurantAdmin`.
 */
export type SystemOperator = { id: string; name: string; email: string };

const TOKEN_KEY = "luku_system_token";

type ApiOperator = { id: string; name: string; email: string };

/** Resposta do 1º passo (senha certa) — o token só vem depois do 2FA
 * (backend TwoFactorController). `setup` = conta ainda sem 2FA, tem de o
 * ativar antes de entrar. */
export type TwoFactorStep = { twoFactor: "required" | "setup"; challenge: string };

export type TwoFactorSetup = { secret: string; otpauthUrl: string };

type SessionPayload = { token: string; user: ApiOperator };

type SystemAdminValue = {
  operator: SystemOperator | null;
  /** Token Sanctum do operador — exposto para o caso raro de "entrar no
   * painel" de um restaurante a partir de `/sistema` (ver
   * `sistema.parceiros.tsx`/`sistema.restaurantes.tsx` +
   * `RestaurantAdminProvider.enterAsOperator`): as Policies do backend dão
   * acesso total a `system_operator` em qualquer restaurante, por isso o
   * próprio token do operador já serve para o painel do restaurante, sem
   * precisar de uma senha que o operador não tem. */
  token: string | null;
  /** false até a sessão guardada ser validada — evita o `SystemShell`
   * redirecionar para `/sistema/entrar` antes disso. */
  hydrated: boolean;
  /** 1º passo — devolve o challenge para o 2FA, nunca abre sessão. */
  login: (email: string, password: string) => Promise<TwoFactorStep>;
  /** Conta sem 2FA: pede o segredo/QR para a app de autenticação. */
  setupTwoFactor: (challenge: string) => Promise<TwoFactorSetup>;
  /** Ativa o 2FA com o 1º código. NÃO abre a sessão logo: devolve os
   * códigos de recuperação (única vez que existem em claro) e uma função
   * para abrir a sessão depois de o operador os guardar. */
  confirmTwoFactor: (
    challenge: string,
    code: string,
  ) => Promise<{ recoveryCodes: string[]; startSession: () => void }>;
  /** Conta com 2FA: código da app OU código de recuperação — abre sessão. */
  verifyTwoFactor: (
    challenge: string,
    input: { code: string } | { recoveryCode: string },
  ) => Promise<{ recoveryCodesLeft: number | undefined }>;
  logout: () => Promise<void>;
};

/** Leitura direta do token guardado, fora de React — para o `beforeLoad` de
 * `/sistema` (ver src/routes/sistema.tsx), que corre antes de qualquer
 * provider montar. Mesmo padrão de `getAdminToken` em `restaurant-admin.tsx`. */
export function getSystemToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

const SystemAdminContext = createContext<SystemAdminValue | null>(null);

export function SystemAdminProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<SystemOperator | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setHydrated(true);
      return;
    }

    apiFetch<{ data: ApiOperator }>("/auth/me", { token: storedToken })
      .then(({ data }) => {
        setOperator(data);
        setToken(storedToken);
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setHydrated(true));
  }, []);

  const startSession = ({ token: newToken, user }: SessionPayload) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setOperator(user);
  };

  const login = async (email: string, password: string) => {
    // Endpoint dedicado (não /auth/login) — auditoria + email de alerta +
    // bloqueio de IP em cada tentativa, ver backend AuthController::
    // systemLogin. Superfície mais sensível da API, isolada de propósito.
    const { data } = await apiFetch<{ data: TwoFactorStep }>("/auth/system/login", {
      method: "POST",
      body: { email, password },
    });
    return data;
  };

  const setupTwoFactor = async (challenge: string) => {
    const { data } = await apiFetch<{ data: TwoFactorSetup }>("/auth/system/2fa/setup", {
      method: "POST",
      body: { challenge },
    });
    return data;
  };

  const confirmTwoFactor = async (challenge: string, code: string) => {
    const { data } = await apiFetch<{ data: SessionPayload & { recoveryCodes: string[] } }>(
      "/auth/system/2fa/confirm",
      { method: "POST", body: { challenge, code } },
    );
    return { recoveryCodes: data.recoveryCodes, startSession: () => startSession(data) };
  };

  const verifyTwoFactor = async (
    challenge: string,
    input: { code: string } | { recoveryCode: string },
  ) => {
    const body =
      "code" in input
        ? { challenge, code: input.code }
        : { challenge, recovery_code: input.recoveryCode };
    const { data } = await apiFetch<{ data: SessionPayload & { recoveryCodesLeft?: number } }>(
      "/auth/system/2fa/verify",
      { method: "POST", body },
    );
    startSession(data);
    return { recoveryCodesLeft: data.recoveryCodesLeft };
  };

  const logout = async () => {
    const currentToken = token;
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setOperator(null);
    if (!currentToken) return;
    try {
      await apiFetch("/auth/logout", { method: "POST", token: currentToken });
    } catch {
      // best-effort — sessão local já foi limpa acima
    }
  };

  return (
    <SystemAdminContext.Provider
      value={{
        operator,
        token,
        hydrated,
        login,
        setupTwoFactor,
        confirmTwoFactor,
        verifyTwoFactor,
        logout,
      }}
    >
      {children}
    </SystemAdminContext.Provider>
  );
}

export function useSystemAdmin() {
  const ctx = useContext(SystemAdminContext);
  if (!ctx) throw new Error("useSystemAdmin must be used inside SystemAdminProvider");
  return ctx;
}

export { ApiError };
