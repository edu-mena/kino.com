import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  /** true até o localStorage ser lido — evita mostrar a home de convidado
   * por um instante antes de trocar pra logada (ou vice-versa). */
  isLoading: boolean;
  login: (name: string, email: string) => void;
  signup: (name: string, email: string, phone: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "kino_auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar usuário do localStorage ao montar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (name: string, email: string) => {
    const newUser: AuthUser = {
      id: "user_" + Math.random().toString(36).slice(2),
      name,
      email,
      phone: "+244 923 456 789",
    };
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  };

  const signup = (name: string, email: string, phone: string) => {
    const newUser: AuthUser = {
      id: "user_" + Math.random().toString(36).slice(2),
      name,
      email,
      phone,
    };
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: user !== null,
        isLoading,
        login,
        signup,
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
