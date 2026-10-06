import { isIosApp } from "@/lib/platform";

/**
 * "Iniciar sessão com Apple" — só na app iOS (Capacitor), onde a App Store o
 * exige ao lado do Google (guideline 4.8). Usa o AuthenticationServices
 * nativo via `@capawesome/capacitor-apple-sign-in`; o backend valida o
 * id_token contra as chaves da Apple (AppleSignInService). Na web/Android
 * não aparece — lá precisaria de um Services ID e de um domínio verificado
 * na conta Apple Developer, sem nada que o exija.
 */
export function isAppleSignInAvailable(): boolean {
  return isIosApp();
}

export type AppleSignInPayload = {
  id_token: string;
  authorization_code: string | null;
  nonce: string;
  given_name: string | null;
  family_name: string | null;
};

/** Nonce aleatório deste login — o backend confirma que o id_token o traz,
 * para um token intercetado noutro login não servir. */
function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function requestAppleSignIn(): Promise<AppleSignInPayload> {
  const { AppleSignIn, SignInScope } = await import("@capawesome/capacitor-apple-sign-in");
  const nonce = randomNonce();
  const result = await AppleSignIn.signIn({
    scopes: [SignInScope.Email, SignInScope.FullName],
    nonce,
  });

  return {
    id_token: result.idToken,
    authorization_code: result.authorizationCode ?? null,
    nonce,
    // A Apple só manda o nome no PRIMEIRO login desta app.
    given_name: result.givenName ?? null,
    family_name: result.familyName ?? null,
  };
}
