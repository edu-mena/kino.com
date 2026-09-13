import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import { getRestaurant } from "@/data/helpers";
import type { Restaurant } from "@/data/types";
import { ApiError, apiFetch, hasRealBackend } from "@/lib/api-client";

const TOKEN_KEY = "luku_admin_token";
const RESTAURANT_ID_KEY = "luku_admin_restaurant";
/** "1" quando o token guardado acima é EMPRESTADO de `useSystemAdmin` (ver
 * `enterAsOperator`) — nunca um token próprio deste painel. Persistido para
 * sobreviver a um refresh enquanto "emprestado". */
const BORROWED_KEY = "luku_admin_token_borrowed";

/** `rest-1` é um restaurante seed real do mock (`src/data/mockData.ts`) —
 * escolhido como restaurante da demo por já ter dados completos (menu,
 * horários, etc.), ver `hasRealBackend`/DEPLOY.md. */
const DEMO_RESTAURANT_ID = "rest-1";

type ApiRestaurantRef = { restaurantId: string; restaurantName: string; roleInRestaurant: string };
type ApiStaffUser = {
  id: string;
  name: string;
  email: string;
  restaurants?: ApiRestaurantRef[];
};

/**
 * Sessão do painel do restaurante — email+senha real (ver plano: sem
 * self-signup, a conta só nasce ao a Luku aprovar uma candidatura de
 * parceiro). Independente da conta de cliente (`useAuth`) e da de sistema
 * (`useSystemAdmin`) — tokens/storage próprios, os 3 podem coexistir no
 * mesmo browser.
 *
 * LIMITAÇÃO CONHECIDA (Fase 2 do plano de backend — só auth, ainda não a
 * migração de dados de Restaurant do mock): `restaurant` abaixo continua a
 * vir de `getRestaurant()` (mock), que só conhece os IDs do seed. Com um
 * restaurante criado a sério no backend (UUID real), isto fica
 * `undefined` até a Fase 1 do plano ("Restaurant+MenuItem") também trocar
 * a camada de leitura do frontend para a API real — o login em si já fica
 * correto e real, só a ficha do restaurante no painel é que não resolve
 * ainda.
 */
type RestaurantAdminValue = {
  managedRestaurantId: string | null;
  restaurant: Restaurant | undefined;
  /** false até a sessão guardada ser validada — evita o `AdminShell`
   * redirecionar pra `/admin/entrar` por engano antes disso. */
  hydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  /**
   * Atalho para um `system_operator` entrar diretamente no painel de um
   * restaurante (ex: logo a seguir a aprovar uma candidatura, ou a partir
   * de `/sistema/restaurantes`) sem precisar da senha do restaurante — o
   * token do operador já basta (RestaurantPolicy dá-lhe acesso total).
   * `operatorToken` vem de `useSystemAdmin().token`, nunca gerado aqui.
   *
   * O token fica marcado como "emprestado" (ver `BORROWED_KEY`) — é o MESMO
   * token que `useSystemAdmin` guarda em paralelo. Sem essa marca, sair
   * deste painel chamaria `/auth/logout` com esse token e revogava-o no
   * backend, derrubando sem aviso a sessão de sistema também (bug
   * encontrado em revisão cruzada). Ver `logout()` abaixo.
   */
  enterAsOperator: (restaurantId: string, operatorToken: string) => void;
  logout: () => Promise<void>;
};

const RestaurantAdminContext = createContext<RestaurantAdminValue | null>(null);

export function RestaurantAdminProvider({ children }: { children: ReactNode }) {
  const [managedRestaurantId, setManagedRestaurantId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // `restaurant` é derivado (chama `getRestaurant`, que aplica as edições
  // de `/admin/perfil`) — sem isto, guardar uma edição não fazia este
  // provider voltar a renderizar, e o painel ficava com dados velhos até a
  // próxima navegação.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const storedRestaurantId = localStorage.getItem(RESTAURANT_ID_KEY);

    if (!token || !storedRestaurantId) {
      setHydrated(true);
    } else if (!hasRealBackend) {
      // Demo sem backend — o "token" guardado é só um sentinela local (ver
      // `login` abaixo), não há API para o validar.
      setManagedRestaurantId(storedRestaurantId);
      setHydrated(true);
    } else if (localStorage.getItem(BORROWED_KEY) === "1") {
      // Sessão emprestada de um operador — não passa pela verificação de
      // "ainda gere este restaurante" abaixo (um operador não aparece em
      // `restaurants` do próprio user), mas ainda valida que o token em si
      // continua válido (ex: se um logout-all foi feito em `/sistema` numa
      // outra aba entretanto, este token já não serve — sem isto o painel
      // mostrava "autenticado" até a primeira chamada real falhar com 401;
      // apontado em revisão cruzada).
      apiFetch("/auth/me", { token })
        .then(() => setManagedRestaurantId(storedRestaurantId))
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(RESTAURANT_ID_KEY);
          localStorage.removeItem(BORROWED_KEY);
        })
        .finally(() => setHydrated(true));
    } else {
      apiFetch<{ data: ApiStaffUser }>("/auth/me", { token })
        .then(({ data }) => {
          // Confirma que o user ainda gere ESTE restaurante (pode ter
          // perdido acesso entretanto) — não confia só no localStorage.
          const stillManages = data.restaurants?.some((r) => r.restaurantId === storedRestaurantId);
          if (stillManages) setManagedRestaurantId(storedRestaurantId);
          else {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(RESTAURANT_ID_KEY);
          }
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(RESTAURANT_ID_KEY);
        })
        .finally(() => setHydrated(true));
    }

    window.addEventListener("luku:menu-changed", forceUpdate);
    window.addEventListener("storage", forceUpdate);
    return () => {
      window.removeEventListener("luku:menu-changed", forceUpdate);
      window.removeEventListener("storage", forceUpdate);
    };
  }, []);

  const login = async (email: string, password: string) => {
    // Demo sem backend (ver DEPLOY.md) — não há API para autenticar
    // email/senha contra ela, então qualquer credencial entra direto no
    // restaurante seed da demo. Nunca acontece em dev/produção real.
    if (!hasRealBackend) {
      localStorage.setItem(TOKEN_KEY, "demo-token");
      localStorage.setItem(RESTAURANT_ID_KEY, DEMO_RESTAURANT_ID);
      localStorage.removeItem(BORROWED_KEY);
      setManagedRestaurantId(DEMO_RESTAURANT_ID);
      return;
    }

    const { data } = await apiFetch<{ data: { token: string; user: ApiStaffUser } }>(
      "/auth/login",
      { method: "POST", body: { email, password } },
    );

    // Um user pode gerir mais de um restaurante (dono com várias casas) —
    // por agora entra sempre no primeiro; escolher entre vários fica para
    // quando o painel tiver um seletor de restaurante (fora do escopo desta
    // fase, que é só auth).
    const restaurantId = data.user.restaurants?.[0]?.restaurantId;
    if (!restaurantId) {
      throw new ApiError(403, "Esta conta não gere nenhum restaurante.");
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(RESTAURANT_ID_KEY, restaurantId);
    localStorage.removeItem(BORROWED_KEY);
    setManagedRestaurantId(restaurantId);
  };

  const enterAsOperator = (restaurantId: string, operatorToken: string) => {
    localStorage.setItem(TOKEN_KEY, operatorToken);
    localStorage.setItem(RESTAURANT_ID_KEY, restaurantId);
    localStorage.setItem(BORROWED_KEY, "1");
    setManagedRestaurantId(restaurantId);
  };

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const borrowed = localStorage.getItem(BORROWED_KEY) === "1";
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(RESTAURANT_ID_KEY);
    localStorage.removeItem(BORROWED_KEY);
    setManagedRestaurantId(null);
    if (!token || borrowed || !hasRealBackend) return; // token emprestado, ou demo — não revoga
    try {
      await apiFetch("/auth/logout", { method: "POST", token });
    } catch {
      // best-effort — sessão local já foi limpa acima
    }
  };

  const value: RestaurantAdminValue = {
    managedRestaurantId,
    restaurant: managedRestaurantId ? getRestaurant(managedRestaurantId) : undefined,
    hydrated,
    login,
    enterAsOperator,
    logout,
  };

  return (
    <RestaurantAdminContext.Provider value={value}>{children}</RestaurantAdminContext.Provider>
  );
}

export function useRestaurantAdmin() {
  const ctx = useContext(RestaurantAdminContext);
  if (!ctx) throw new Error("useRestaurantAdmin must be used inside RestaurantAdminProvider");
  return ctx;
}
