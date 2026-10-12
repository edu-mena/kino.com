/**
 * Para onde voltar depois de entrar. Quem lê o QR de uma mesa, escolhe os
 * pratos e toca em "Entrar para pedir" tem de voltar à MESA, não à página
 * inicial — senão perde o contexto (e muitas vezes desiste). Só caminhos
 * internos (começam por "/", nunca "//"), válidos 30 minutos.
 */
const KEY = "luku_post_login_redirect";
const TTL_MS = 30 * 60 * 1000;

function isSafePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");
}

export function setPostLoginRedirect(path: string) {
  if (!isSafePath(path)) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    // ignora (modo privado)
  }
}

/** Lê e apaga — usar só uma vez, logo depois do login. */
export function consumePostLoginRedirect(): string | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path: string; at: number };
    return isSafePath(path) && Date.now() - at < TTL_MS ? path : null;
  } catch {
    return null;
  }
}
