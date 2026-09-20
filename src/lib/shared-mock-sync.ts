/**
 * Camada opcional que liga o `localStorage` desta aba a um servidor local
 * partilhado (ver `mock-server/`), para testar o Luku com dados mock
 * **sincronizados entre vários dispositivos na mesma rede** — sem envolver
 * o backend real (ver plano de infraestrutura). Só existe para isso: um
 * ambiente de teste descartável, nunca corre em produção/Vercel/demo.
 *
 * Desligado por default — sem `VITE_SHARED_MOCK_URL`, este módulo não faz
 * NADA (nem um `fetch`), zero custo/risco no resto da app. Isto é
 * deliberadamente a ÚNICA coisa que este módulo faz sozinho: nenhuma das
 * ~35 stores em `src/data`/`src/lib` sabe que isto existe — todas
 * continuam a fazer `localStorage.getItem/setItem/removeItem` como sempre,
 * porque a sincronização acontece por baixo, interceitando essas mesmas
 * chamadas nativas.
 *
 * Sessão/login (`authUser`/`systemOperator`/`restaurantAdmin`, ver
 * `STORAGE_KEYS`) fica de fora de propósito — cada dispositivo mantém o
 * seu próprio login; só os dados de catálogo/pedidos/reservas/etc.
 * sincronizam.
 */
import { STORAGE_KEYS, CHANGE_EVENT } from "@/data/storage-keys";

const SERVER_URL = (import.meta.env["VITE_SHARED_MOCK_URL"] as string | undefined)
  ?.trim()
  .replace(/\/$/, "");

const UNSYNCED_KEYS: readonly string[] = [
  STORAGE_KEYS.authUser,
  STORAGE_KEYS.systemOperator,
  STORAGE_KEYS.restaurantAdmin,
];

function isSyncedKey(key: string): boolean {
  return (Object.values(STORAGE_KEYS) as string[]).includes(key) && !UNSYNCED_KEYS.includes(key);
}

/** Estado remoto conhecido — usado para (a) não reenviar ao servidor um
 * valor que acabou de vir de lá (evita eco/loop) e (b) só aplicar no poll
 * as chaves que de facto mudaram desde a última vez. */
const lastKnownRemote = new Map<string, string>();

function notifyLocalListeners(key: string, newValue: string | null) {
  // As stores já existentes ouvem um destes dois — ver restaurant-admin.tsx
  // e outros providers. Disparar os dois cobre todos os casos sem precisar
  // de saber qual cada um escuta.
  window.dispatchEvent(
    new StorageEvent("storage", { key, newValue, storageArea: window.localStorage }),
  );
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

async function pushToServer(key: string, value: string | null) {
  try {
    if (value === null) {
      await fetch(`${SERVER_URL}/state/${encodeURIComponent(key)}`, { method: "DELETE" });
    } else {
      await fetch(`${SERVER_URL}/state/${encodeURIComponent(key)}`, { method: "PUT", body: value });
    }
  } catch {
    // Melhor esforço — o servidor de teste pode estar em baixo a meio de um
    // teste (ex. reiniciado); a escrita local já aconteceu, não há nada
    // crítico a proteger aqui.
  }
}

function interceptLocalStorage() {
  const nativeSetItem = window.localStorage.setItem.bind(window.localStorage);
  const nativeRemoveItem = window.localStorage.removeItem.bind(window.localStorage);

  window.localStorage.setItem = (key: string, value: string) => {
    nativeSetItem(key, value);
    if (isSyncedKey(key)) {
      lastKnownRemote.set(key, value);
      void pushToServer(key, value);
    }
  };

  window.localStorage.removeItem = (key: string) => {
    nativeRemoveItem(key);
    if (isSyncedKey(key)) {
      lastKnownRemote.delete(key);
      void pushToServer(key, null);
    }
  };

  return { nativeSetItem, nativeRemoveItem };
}

async function fetchRemoteState(): Promise<Record<string, string>> {
  const response = await fetch(`${SERVER_URL}/state`);
  if (!response.ok) throw new Error(`GET /state falhou: ${response.status}`);
  return (await response.json()) as Record<string, string>;
}

async function seedFromServer(nativeSetItem: (key: string, value: string) => void) {
  const remoteState = await fetchRemoteState();
  for (const [key, value] of Object.entries(remoteState)) {
    if (!isSyncedKey(key)) continue;
    lastKnownRemote.set(key, value);
    nativeSetItem(key, value);
  }
  // Refresh genérico pós-seed — só o CHANGE_EVENT (sem `key`), para não
  // fingir um StorageEvent com uma chave que pode não ter mudado de facto.
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function startPolling(nativeSetItem: (key: string, value: string) => void) {
  const POLL_INTERVAL_MS = 2000;

  setInterval(async () => {
    let remoteState: Record<string, string>;
    try {
      remoteState = await fetchRemoteState();
    } catch {
      return; // servidor em baixo momentaneamente — tenta de novo no próximo tick
    }

    for (const [key, value] of Object.entries(remoteState)) {
      if (!isSyncedKey(key)) continue;
      if (lastKnownRemote.get(key) === value) continue; // sem mudança

      lastKnownRemote.set(key, value);
      nativeSetItem(key, value);
      notifyLocalListeners(key, value);
    }
  }, POLL_INTERVAL_MS);
}

if (typeof window !== "undefined" && SERVER_URL) {
  console.info(
    `[shared-mock-sync] ligado a ${SERVER_URL} — dados mock partilhados entre dispositivos.`,
  );
  const { nativeSetItem } = interceptLocalStorage();
  void seedFromServer(nativeSetItem).then(() => startPolling(nativeSetItem));
}
