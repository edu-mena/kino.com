/**
 * Carrega o script do Google Identity Services (GIS) e expõe o
 * authorization-code flow usado pelo login de cliente real (ver plano —
 * `POST /api/v1/auth/google/callback {code}`). Só o caminho Web; mobile
 * nativo usaria o SDK Google Sign-In próprio (id_token direto), fora do
 * escopo desta app web.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: "popup";
            callback: (response: { code?: string; error?: string }) => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptLoadPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  scriptLoadPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("google_gis_script_failed"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

/** Abre o popup do Google e devolve o `code` do authorization-code flow —
 * rejeita se o script não carregar, o utilizador fechar o popup, ou o
 * client_id não estiver configurado (ver VITE_GOOGLE_WEB_CLIENT_ID).
 *
 * Sem `redirect_uri` de propósito: em `ux_mode: "popup"` o GIS ignora esse
 * campo — o `code` devolvido é sempre emitido contra o pseudo-redirect
 * `'postmessage'`, nunca contra a origem da página. Passar a origem aqui
 * (bug encontrado em revisão cruzada, nunca chegou a correr em browser
 * real) fazia o backend trocar o `code` no Google com o `redirect_uri`
 * errado — Google responde `redirect_uri_mismatch` e o login falha sempre.
 * O backend (`GoogleOAuthService::resolveFromAuthorizationCode`) já fixa
 * `'postmessage'` do lado dele, sem depender de nada enviado por aqui. */
export async function requestGoogleAuthorizationCode(): Promise<string> {
  const clientId = (import.meta.env["VITE_GOOGLE_WEB_CLIENT_ID"] as string | undefined)?.trim();
  if (!clientId) {
    throw new Error("google_client_id_missing");
  }

  await loadScript();

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("google_gis_unavailable"));
      return;
    }

    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: "openid email profile",
      ux_mode: "popup",
      callback: (response) => {
        if (response.code) resolve(response.code);
        else reject(new Error(response.error ?? "google_auth_dismissed"));
      },
    });

    client.requestCode();
  });
}
