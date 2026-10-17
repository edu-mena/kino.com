/**
 * Links da Luku dentro da app nativa (iOS/Android):
 *
 * - `lukuPathFrom`: transforma um URL lido de um QR (ou recebido pelo
 *   sistema) no caminho interno da app — só para domínios da Luku. Tudo o
 *   resto devolve `null` (a app nunca abre URLs de terceiros sozinha).
 * - `listenForAppLinks`: Universal Links (iOS) / App Links (Android) — um
 *   link `https://luku.ao/...` aberto noutra app (câmara, WhatsApp, email)
 *   abre a app em vez do browser, e aqui navegamos para a página certa.
 *   O lado do servidor está em `public/.well-known/` e o do iOS no
 *   `App.entitlements` (`applinks:luku.ao`).
 */

const LUKU_HOSTS = new Set(["luku.ao", "www.luku.ao"]);

export function lukuPathFrom(raw: string): string | null {
  const text = raw.trim();
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    // QR com só "luku.ao/q/ABC" (sem https://) também conta.
    try {
      url = new URL(`https://${text}`);
    } catch {
      return null;
    }
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!LUKU_HOSTS.has(url.hostname.toLowerCase())) return null;
  return `${url.pathname}${url.search}${url.hash}` || "/";
}

/** No-op na web. Devolve a função para parar de ouvir. */
export async function listenForAppLinks(navigate: (path: string) => void): Promise<() => void> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return () => {};

  const { App } = await import("@capacitor/app");
  const handle = await App.addListener("appUrlOpen", ({ url }) => {
    const path = lukuPathFrom(url);
    if (path) navigate(path);
  });
  return () => {
    void handle.remove();
  };
}
