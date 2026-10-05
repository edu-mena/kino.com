import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import { getRestaurant } from "@/data/helpers";
import type { Restaurant } from "@/data/types";
import { useRestaurantDetail } from "@/data/use-restaurants-query";
import { ApiError, apiFetch, hasRealBackend } from "@/lib/api-client";
import { forgetPushOnLogout } from "@/lib/push-notifications";

const TOKEN_KEY = "luku_admin_token";
const RESTAURANT_ID_KEY = "luku_admin_restaurant";

/** Token Sanctum do restaurante/operador autenticado no painel `/admin`,
 * lido diretamente do localStorage — para quem precisa de chamar `apiFetch`
 * fora de um componente (ver `getAuthToken` em `@/lib/auth`, mesmo padrão).
 * `null` em demo (`!hasRealBackend`) ou sem sessão. */
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** `true` quando o painel está aberto por um operador de sistema (entrou a
 * partir de `/sistema`, com o token do próprio operador — ver
 * `enterAsOperator`). Nesse modo, o que se registar em nome da sessão fica
 * na conta do operador, não na do restaurante. */
export function isOperatorAdminSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(BORROWED_KEY) === "1";
  } catch {
    return false;
  }
}
/** Id (uuid) do restaurante gerido pelo token acima — mesmo padrão/uso:
 * consumido por `SubscriptionsProvider` (raiz), que precisa de saber a
 * subscrição do PRÓPRIO restaurante do painel `/admin` mas não pode usar
 * `useRestaurantAdmin()` (esse provider só existe dentro de
 * `OperatorProviders`, montado abaixo da raiz — nunca um ancestral pode ler
 * o contexto de um descendente). */
export function getManagedRestaurantId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(RESTAURANT_ID_KEY);
  } catch {
    return null;
  }
}
/** Versão reativa de `getManagedRestaurantId()` — para providers montados no
 * `__root` (`MenuAdminProvider`, `CartProvider`, `ReservationsProvider`,
 * `TablesProvider`) que precisam de saber qual restaurante o painel
 * `/admin` está a gerir, sem poderem usar `useRestaurantAdminOptional()`
 * pela mesma razão do comentário acima: esses providers são ANCESTRAIS de
 * `RestaurantAdminProvider` na árvore (montado só dentro de
 * `OperatorProviders`, abaixo da raiz), nunca conseguem ler o contexto
 * dele. Bug real, encontrado porque isto fazia `managedRestaurantId` ficar
 * sempre `null` nesses 4 providers — cardápio/pedidos/reservas/mesas do
 * painel do restaurante ficavam sempre vazios com backend real, mesmo com
 * dados a existir a sério no servidor (`login`/`enterAsOperator`/`logout`
 * disparam `luku:menu-changed` propositadamente para isto reagir no
 * mesmo instante, sem depender do evento `storage` — que só chega a
 * OUTRAS abas, nunca à mesma que acabou de fazer login). */
export function useManagedRestaurantId(): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setId(getManagedRestaurantId());
    sync();
    window.addEventListener("luku:menu-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("luku:menu-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return id;
}

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

type StaffSession = { token: string; user: ApiStaffUser };

/** Resposta do login quando a conta tem a verificação em dois passos ligada
 * (backend StaffTwoFactorController) — o token só vem em `verifyTwoFactor`. */
export type StaffTwoFactorStep = { twoFactor: "required"; challenge: string };

/**
 * Sessão do painel do restaurante — email+senha real (ver plano: sem
 * self-signup, a conta só nasce ao a Luku aprovar uma candidatura de
 * parceiro). Independente da conta de cliente (`useAuth`) e da de sistema
 * (`useSystemAdmin`) — tokens/storage próprios, os 3 podem coexistir no
 * mesmo browser.
 *
 * `restaurant` vem da API real quando `hasRealBackend` (ver
 * useRestaurantDetail) — sem isto, um UUID real (não um id de seed tipo
 * "rest-1") resolvia sempre para `undefined` em `getRestaurant()` (mock) e
 * o painel rebentava com ecrã branco assim que qualquer página lesse
 * `restaurant.algumCampo` (bug real, encontrado a testar o login a sério).
 * Páginas do painel que ainda leem pedidos/cardápio/reservas via mock
 * continuam a mostrar listas vazias para um restaurante real — só o objeto
 * `restaurant` em si está ligado à API por agora, não essas sub-entidades.
 */
type RestaurantAdminValue = {
  managedRestaurantId: string | null;
  restaurant: Restaurant | undefined;
  /** false até a sessão guardada ser validada — evita o `AdminShell`
   * redirecionar pra `/admin/entrar` por engano antes disso. */
  hydrated: boolean;
  /** Entra direto, ou devolve o challenge se a conta tiver 2FA ligado. */
  login: (email: string, password: string) => Promise<StaffTwoFactorStep | null>;
  /** 2º passo do login com 2FA — código da app ou de recuperação. */
  verifyTwoFactor: (
    challenge: string,
    input: { code: string } | { recoveryCode: string },
  ) => Promise<{ recoveryCodesLeft: number | undefined }>;
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
  // Só dispara o fetch real quando de facto há um id de restaurante gerido
  // — `useRestaurantDetail` já trata `undefined` como "desligado" (`enabled`).
  const { data: apiRestaurant } = useRestaurantDetail(
    hasRealBackend && managedRestaurantId ? managedRestaurantId : undefined,
  );
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

  const startSession = ({ token, user }: StaffSession) => {
    // Um user pode gerir mais de um restaurante (dono com várias casas) —
    // por agora entra sempre no primeiro; escolher entre vários fica para
    // quando o painel tiver um seletor de restaurante (fora do escopo desta
    // fase, que é só auth).
    const restaurantId = user.restaurants?.[0]?.restaurantId;
    if (!restaurantId) {
      throw new ApiError(403, "Esta conta não gere nenhum restaurante.");
    }

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(RESTAURANT_ID_KEY, restaurantId);
    localStorage.removeItem(BORROWED_KEY);
    setManagedRestaurantId(restaurantId);
    window.dispatchEvent(new Event("luku:menu-changed"));
  };

  const login = async (email: string, password: string) => {
    // Demo sem backend (ver DEPLOY.md) — não há API para autenticar
    // email/senha contra ela, então qualquer credencial entra direto no
    // restaurante seed da demo. Nunca acontece em dev/produção real.
    if (!hasRealBackend) {
      localStorage.setItem(TOKEN_KEY, "demo-token");
      localStorage.setItem(RESTAURANT_ID_KEY, DEMO_RESTAURANT_ID);
      localStorage.removeItem(BORROWED_KEY);
      setManagedRestaurantId(DEMO_RESTAURANT_ID);
      window.dispatchEvent(new Event("luku:menu-changed"));
      return null;
    }

    const { data } = await apiFetch<{ data: StaffSession | StaffTwoFactorStep }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    if ("challenge" in data) return data;
    startSession(data);
    return null;
  };

  const verifyTwoFactor = async (
    challenge: string,
    input: { code: string } | { recoveryCode: string },
  ) => {
    const body =
      "code" in input
        ? { challenge, code: input.code }
        : { challenge, recovery_code: input.recoveryCode };
    const { data } = await apiFetch<{ data: StaffSession & { recoveryCodesLeft?: number } }>(
      "/auth/2fa/verify",
      { method: "POST", body },
    );
    startSession(data);
    return { recoveryCodesLeft: data.recoveryCodesLeft };
  };

  const enterAsOperator = (restaurantId: string, operatorToken: string) => {
    localStorage.setItem(TOKEN_KEY, operatorToken);
    localStorage.setItem(RESTAURANT_ID_KEY, restaurantId);
    localStorage.setItem(BORROWED_KEY, "1");
    setManagedRestaurantId(restaurantId);
    window.dispatchEvent(new Event("luku:menu-changed"));
  };

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const borrowed = localStorage.getItem(BORROWED_KEY) === "1";
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(RESTAURANT_ID_KEY);
    localStorage.removeItem(BORROWED_KEY);
    setManagedRestaurantId(null);
    window.dispatchEvent(new Event("luku:menu-changed"));
    if (!token || !hasRealBackend) return;
    // Antes de revogar a sessão: este dispositivo deixa de receber o push do
    // painel (depois do logout o token já não serviria para o apagar).
    await forgetPushOnLogout(token, "restaurant");
    if (borrowed) return; // token emprestado (operador) — não revoga
    try {
      await apiFetch("/auth/logout", { method: "POST", token });
    } catch {
      // best-effort — sessão local já foi limpa acima
    }
  };

  const value: RestaurantAdminValue = {
    managedRestaurantId,
    restaurant: hasRealBackend
      ? apiRestaurant
      : managedRestaurantId
        ? getRestaurant(managedRestaurantId)
        : undefined,
    hydrated,
    login,
    verifyTwoFactor,
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
