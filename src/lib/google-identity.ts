/**
 * Dois caminhos de login de cliente, escolhidos por plataforma (ver
 * `useAuth().loginWithGoogle` em `auth.tsx`, que decide qual chamar via
 * `Capacitor.isNativePlatform()`):
 *
 * - **Web**: Google Identity Services (GIS), authorization-code flow em
 *   popup — `requestGoogleAuthorizationCode()` abaixo.
 * - **App nativa (Android/iOS, Capacitor)**: SDK nativo do Google Sign-In
 *   via `@capawesome/capacitor-google-sign-in` — `requestGoogleIdToken()`
 *   abaixo. O fluxo GIS de cima NÃO funciona dentro de uma WebView
 *   embutida (Capacitor): o Google bloqueia ativamente OAuth nesse
 *   contexto (`disallowed_useragent`) — daí precisar de um caminho
 *   totalmente à parte, não de um ajuste no popup.
 *
 * Ambos acabam por chamar `POST /api/v1/auth/google/callback`, só que com
 * shapes diferentes (`{code}` no caminho web, `{id_token}` no nativo — o
 * backend já aceita os dois, ver `AuthController::googleCallback`).
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

let googleSignInInitialized = false;

/** Chama `GoogleSignIn.initialize` só uma vez por sessão da app — chamar
 * de novo não faz mal (`initialize` é idempotente do lado do plugin), mas
 * evita reimportar/reconfigurar o SDK nativo a cada tentativa de login. */
async function ensureGoogleSignInInitialized(): Promise<void> {
  if (googleSignInInitialized) return;

  const clientId = (import.meta.env["VITE_GOOGLE_WEB_CLIENT_ID"] as string | undefined)?.trim();
  if (!clientId) {
    throw new Error("google_client_id_missing");
  }

  const { GoogleSignIn } = await import("@capawesome/capacitor-google-sign-in");
  // O clientId aqui é sempre o WEB client id — mesmo em Android/iOS (ver
  // docs do plugin: usado como "server client id" pelo Credential
  // Manager/SDK nativo). O client id específico da plataforma
  // (Android/iOS) vive só na config nativa (google-services / Info.plist +
  // URL scheme), nunca em JS — ver capacitor/README.md.
  await GoogleSignIn.initialize({ clientId });
  googleSignInInitialized = true;
}

/** App nativa — abre o ecrã/diálogo nativo do Google Sign-In e devolve o
 * `id_token` (JWT) da conta escolhida. Rejeita com
 * `ErrorCode.SignInCanceled` ("SIGN_IN_CANCELED") se o utilizador fechar o
 * ecrã sem escolher conta — `entrar.tsx` trata isso como o mesmo
 * "dismissed" silencioso do caminho web, não como erro a mostrar. */
export async function requestGoogleIdToken(): Promise<string> {
  await ensureGoogleSignInInitialized();

  const { GoogleSignIn } = await import("@capawesome/capacitor-google-sign-in");
  const result = await GoogleSignIn.signIn();

  return result.idToken;
}
