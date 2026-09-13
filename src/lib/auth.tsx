import { Capacitor } from "@capacitor/core";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, apiFetch, hasRealBackend } from "@/lib/api-client";
import { requestGoogleAuthorizationCode, requestGoogleIdToken } from "@/lib/google-identity";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  /** Login real (Google) não garante telefone — ao contrário do mock
   * anterior, que tinha sempre um valor fixo. Consumidores têm de tolerar
   * `undefined` (ver `@/routes/perfil.tsx` para o padrão). */
  phone?: string | undefined;
  avatarUrl?: string | undefined;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  /** true até validarmos o token guardado (ou confirmarmos que não há) —
   * evita mostrar a home de convidado por um instante antes de trocar pra
   * logada (ou vice-versa). */
  isLoading: boolean;
  /** Abre o popup do Google e autentica — só isto existe como login de
   * cliente (ver plano de backend: sem email/senha para este papel). */
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "luku_auth_token";
/** Sessão fictícia usada só quando `hasRealBackend` é false (demo em
 * `*.vercel.app`, ver DEPLOY.md) — guarda o `AuthUser` inteiro (não um
 * token, não há API para o validar), chave própria para nunca colidir com
 * `TOKEN_KEY` nem ser confundida com uma sessão real. */
const DEMO_USER_KEY = "luku_demo_auth_user";

const DEMO_USER: AuthUser = {
  id: "demo-user",
  name: "Cliente Demo",
  email: "cliente.demo@luku.ao",
};

type ApiUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
};

function mapUser(apiUser: ApiUser): AuthUser {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    phone: apiUser.phone ?? undefined,
    avatarUrl: apiUser.avatarUrl ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaura a sessão a partir do token guardado — valida contra a API
  // (GET /auth/me) em vez de confiar cegamente no que está no
  // localStorage, para apanhar token expirado/revogado.
  //
  // Sem backend configurado (demo, ver `hasRealBackend`), não há API para
  // validar nada contra — a sessão fictícia guardada em `DEMO_USER_KEY` é
  // restaurada diretamente.
  useEffect(() => {
    if (!hasRealBackend) {
      const demoUser = localStorage.getItem(DEMO_USER_KEY);
      if (demoUser) setUser(JSON.parse(demoUser) as AuthUser);
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiFetch<{ data: ApiUser }>("/auth/me", { token })
      .then(({ data }) => setUser(mapUser(data)))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const loginWithGoogle = async () => {
    // Demo sem backend (ver DEPLOY.md, "Demo em *.vercel.app") — sem API
    // real para trocar o código de autorização do Google por um token, o
    // clique aqui entraria sempre com erro de rede. Em vez disso entra
    // direto com um utilizador fictício local, sem passar pelo Google.
    // Nunca acontece em dev/produção real, onde `VITE_API_BASE_URL` está
    // sempre definida (ver `hasRealBackend`).
    if (!hasRealBackend) {
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(DEMO_USER));
      setUser(DEMO_USER);
      return;
    }

    // App nativa (Android/iOS) vs browser — o fluxo popup do GIS não
    // funciona dentro da WebView embutida do Capacitor (Google bloqueia
    // OAuth aí), por isso a app nativa usa o SDK Google Sign-In próprio em
    // vez disso. Ver google-identity.ts para o porquê dos dois caminhos.
    const body = Capacitor.isNativePlatform()
      ? { id_token: await requestGoogleIdToken() }
      : { code: await requestGoogleAuthorizationCode() };

    const { data } = await apiFetch<{ data: { token: string; user: ApiUser } }>(
      "/auth/google/callback",
      { method: "POST", body },
    );
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(mapUser(data.user));
  };

  const logout = async () => {
    if (!hasRealBackend) {
      localStorage.removeItem(DEMO_USER_KEY);
      setUser(null);
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    if (!token) return;
    // Best-effort — mesmo que a chamada falhe (backend em baixo, token já
    // expirado), a sessão local já foi limpa acima.
    try {
      await apiFetch("/auth/logout", { method: "POST", token });
    } catch {
      // ignora — ver comentário acima
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: user !== null,
        isLoading,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}

export { ApiError };
