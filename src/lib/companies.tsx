import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createApiCompany,
  deleteApiCompany,
  fetchApiCompanies,
  updateApiCompany,
} from "@/data/api-companies";
import type { Company } from "@/data/types";
import { hasRealBackend } from "@/lib/api-client";
import { getAuthToken, useAuth } from "@/lib/auth";

const STORAGE_KEY = "luku_companies";

export type CompanyInput = { name: string; nif: string; email: string };

type CompaniesValue = {
  companies: Company[];
  /** `null` = falhou (validação do backend ou erro de rede) — quem chama
   * (ex.: "Nova empresa" no cartão de pedido) não deve avançar como se
   * tivesse uma empresa escolhida. */
  createCompany: (input: CompanyInput) => Promise<Company | null>;
  updateCompany: (id: string, input: CompanyInput) => Promise<boolean>;
  deleteCompany: (id: string) => Promise<boolean>;
};

const CompaniesContext = createContext<CompaniesValue | null>(null);

function readLocal(): Company[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Company[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: Company[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // quota cheia — sem storage de reserva, perde-se silenciosamente como
    // o resto do app faz noutros stores locais de baixo risco.
  }
}

/**
 * Empresas do cliente (nome/NIF/email), para pedir fatura com NIF no
 * momento do pedido — geridas em `/perfil` e/ou criadas na hora, direto do
 * cartão de pedido (`order-builder-card.tsx`). Ao contrário de
 * `@/lib/addresses` (achado: sempre local, nunca ligado à API real, mesmo
 * em produção), este provider fala com o backend real desde o início
 * quando `hasRealBackend` — só cai para `localStorage` no modo demo, sem
 * backend nenhum configurado.
 */
export function CompaniesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>(hasRealBackend ? [] : readLocal());

  const refetchApi = () => {
    const token = getAuthToken();
    if (!token) return setCompanies([]);
    fetchApiCompanies(token)
      .then(setCompanies)
      .catch(() => setCompanies([]));
  };

  useEffect(() => {
    if (hasRealBackend) refetchApi();
  }, [user?.email, user?.phone]);

  const value: CompaniesValue = hasRealBackend
    ? {
        companies,
        createCompany: async (input) => {
          const token = getAuthToken();
          if (!token) return null;
          try {
            const company = await createApiCompany(input, token);
            refetchApi();
            return company;
          } catch {
            return null;
          }
        },
        updateCompany: async (id, input) => {
          const token = getAuthToken();
          if (!token) return false;
          try {
            await updateApiCompany(id, input, token);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
        deleteCompany: async (id) => {
          const token = getAuthToken();
          if (!token) return false;
          try {
            await deleteApiCompany(id, token);
            refetchApi();
            return true;
          } catch {
            return false;
          }
        },
      }
    : {
        companies,
        createCompany: (input) => {
          const company: Company = { id: `company-${Date.now()}`, ...input };
          const next = [...readLocal(), company];
          writeLocal(next);
          setCompanies(next);
          return Promise.resolve(company);
        },
        updateCompany: (id, input) => {
          const next = readLocal().map((c) => (c.id === id ? { ...c, ...input } : c));
          writeLocal(next);
          setCompanies(next);
          return Promise.resolve(true);
        },
        deleteCompany: (id) => {
          const next = readLocal().filter((c) => c.id !== id);
          writeLocal(next);
          setCompanies(next);
          return Promise.resolve(true);
        },
      };

  return <CompaniesContext.Provider value={value}>{children}</CompaniesContext.Provider>;
}

export function useCompanies() {
  const ctx = useContext(CompaniesContext);
  if (!ctx) throw new Error("useCompanies must be used inside CompaniesProvider");
  return ctx;
}
