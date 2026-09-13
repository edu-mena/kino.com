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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

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

  const login = async (email: string, password: string) => {
    // Endpoint dedicado (não /auth/login) — auditoria + email de alerta +
    // bloqueio de IP em cada tentativa, ver backend AuthController::
    // systemLogin. Superfície mais sensível da API, isolada de propósito.
    const { data } = await apiFetch<{ data: { token: string; user: ApiOperator } }>(
      "/auth/system/login",
      { method: "POST", body: { email, password } },
    );

    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setOperator(data.user);
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
    <SystemAdminContext.Provider value={{ operator, token, hydrated, login, logout }}>
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
