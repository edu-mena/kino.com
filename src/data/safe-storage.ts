/**
 * Escreve no `localStorage` sem deixar o erro propagar e rebentar a
 * interação do utilizador — o caso real que isto cobre é a quota do browser
 * (~5-10MB por origem, para TODOS os dados da app) sendo excedida, algo que
 * uploads de imagem em base64 (sem backend real, ver `@/lib/image-upload`)
 * tornam bem mais provável do que num `localStorage` só de texto. Devolve
 * `false` em vez de lançar, para quem chama poder avisar o utilizador em
 * vez de simplesmente perder a escrita em silêncio.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
