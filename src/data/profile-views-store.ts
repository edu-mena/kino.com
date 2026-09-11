import { safeLocalStorageSet } from "./safe-storage";
import { CHANGE_EVENT, STORAGE_KEYS } from "./storage-keys";

/**
 * "Quem viu o seu perfil" — contagem de visitas à página pública do
 * restaurante. Método padrão de mercado (LinkedIn, Instagram): conta
 * VISITANTES ÚNICOS, não recarregamentos de página. Reabrir/atualizar a
 * mesma página, ou ir e voltar em segundos, não soma uma visita nova — só
 * volta a contar depois de uma janela de sessão sem retorno, como o
 * "session" do Google Analytics. Cada visitante fica uma linha só, com a
 * data da última visita e quantas vezes voltou.
 */
export type ProfileViewer = {
  restaurantId: string;
  viewerKey: string;
  /** Nome de quem visitou, quando a conta tem um — ausente para convidados. */
  viewerName?: string;
  firstAt: string;
  lastAt: string;
  /** Nº de visitas (sessões) distintas — não de páginas vistas. */
  visits: number;
};

/** Sem retorno dentro desta janela → mesma visita, não conta outra vez. */
const SESSION_WINDOW_MS = 30 * 60 * 1000;

type State = { viewers: ProfileViewer[] };
const EMPTY: State = { viewers: [] };

function read(): State {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.profileViews);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(state: State) {
  if (typeof window === "undefined") return;
  if (safeLocalStorageSet(STORAGE_KEYS.profileViews, JSON.stringify(state))) {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

/**
 * Regista uma visita ao perfil de `restaurantId`. Não faz nada se:
 * — for o próprio gestor deste restaurante a ver a sua página (sessão de
 *   admin ativa neste browser, ver `@/lib/restaurant-admin`);
 * — o mesmo visitante já esteve cá dentro da janela de sessão (refresh,
 *   voltar atrás, dupla invocação de efeito em dev).
 */
export function recordProfileView(
  restaurantId: string,
  viewer: { key: string; name?: string },
): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(STORAGE_KEYS.restaurantAdmin) === restaurantId) return;
  } catch {
    // localStorage indisponível — segue sem a exclusão do gestor.
  }

  const state = read();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const idx = state.viewers.findIndex(
    (v) => v.restaurantId === restaurantId && v.viewerKey === viewer.key,
  );

  if (idx === -1) {
    write({
      viewers: [
        ...state.viewers,
        {
          restaurantId,
          viewerKey: viewer.key,
          ...(viewer.name ? { viewerName: viewer.name } : {}),
          firstAt: nowIso,
          lastAt: nowIso,
          visits: 1,
        },
      ],
    });
    return;
  }

  const existing = state.viewers[idx]!;
  if (now - new Date(existing.lastAt).getTime() < SESSION_WINDOW_MS) return;

  write({
    viewers: state.viewers.map((v, i) =>
      i === idx
        ? {
            ...v,
            ...(viewer.name ? { viewerName: viewer.name } : {}),
            lastAt: nowIso,
            visits: v.visits + 1,
          }
        : v,
    ),
  });
}

/** Visitantes únicos de um restaurante, mais recente primeiro. */
export function getProfileViewers(restaurantId: string): ProfileViewer[] {
  return read()
    .viewers.filter((v) => v.restaurantId === restaurantId)
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
}
