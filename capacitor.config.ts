import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Empacotamento do frontend como app (Capacitor). O Luku é uma app SSR
 * (TanStack Start), por isso o `webDir` não tem um bundle offline pronto —
 * a app carrega um servidor a correr, definido por `CAP_SERVER_URL`:
 *
 *   # dev na rede local (o IP da máquina + a porta do `npm run dev`)
 *   CAP_SERVER_URL=http://192.168.1.194:8081 npx cap sync android
 *
 *   # apontar a um ambiente publicado
 *   CAP_SERVER_URL=https://staging.luku.com npx cap sync android
 *
 * Sem `CAP_SERVER_URL`, a app mostra a página estática de `capacitor/www`
 * (só um aviso de configuração). Ver `capacitor/README.md`.
 */
const serverUrl = process.env.CAP_SERVER_URL?.trim();

const isDevHttpServer = !!serverUrl?.startsWith("http://");

const config: CapacitorConfig = {
  appId: "com.luku.app",
  appName: "Luku",
  webDir: "capacitor/www",
  android: {
    // Só com servidor de dev http:// na LAN. Em produção (https://luku.ao)
    // fica desligado: conteúdo http numa página https podia ser trocado por
    // quem estiver na mesma rede e ler a sessão (auditoria de segurança,
    // Fase 5).
    allowMixedContent: isDevHttpServer,
  },
  server: {
    androidScheme: "https",
    // Sem rede / servidor em baixo: página local `capacitor/www/offline.html`
    // em vez do ecrã de erro em branco da WebView (as lojas rejeitam apps
    // que ficam num ecrã vazio sem ligação).
    ...(serverUrl ? { url: serverUrl, cleartext: isDevHttpServer, errorPath: "offline.html" } : {}),
  },
};

export default config;
