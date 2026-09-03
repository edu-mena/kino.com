import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Sessão da área de administração de sistema (`/sistema/*`) — os operadores
 * da plataforma (não os gestores de restaurante, que usam
 * `useRestaurantAdmin`). Sem backend: "entrar" é escolher quem és, como
 * demonstração. Completamente à parte de `useAuth` e `useRestaurantAdmin`.
 */
export type SystemOperator = { id: string; name: string; role: string };

export const OPERATORS: SystemOperator[] = [
  { id: "op-rosinho", name: "Christopher Rosinho", role: "CEO" },
  { id: "op-mena", name: "Eduardo Mena", role: "CTO" },
];

const STORAGE_KEY = "kino_system_operator";

type SystemAdminValue = {
  operatorId: string | null;
  operator: SystemOperator | undefined;
  /** false até o localStorage ser lido — evita o `SystemShell` redirecionar
   * para `/sistema/entrar` antes de a sessão guardada carregar. */
  hydrated: boolean;
  login: (operatorId: string) => void;
  logout: () => void;
};

const SystemAdminContext = createContext<SystemAdminValue | null>(null);

export function SystemAdminProvider({ children }: { children: ReactNode }) {
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setOperatorId(stored);
    setHydrated(true);
  }, []);

  const login = (id: string) => {
    setOperatorId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const logout = () => {
    setOperatorId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value: SystemAdminValue = {
    operatorId,
    operator: OPERATORS.find((o) => o.id === operatorId),
    hydrated,
    login,
    logout,
  };

  return <SystemAdminContext.Provider value={value}>{children}</SystemAdminContext.Provider>;
}

export function useSystemAdmin() {
  const ctx = useContext(SystemAdminContext);
  if (!ctx) throw new Error("useSystemAdmin must be used inside SystemAdminProvider");
  return ctx;
}
