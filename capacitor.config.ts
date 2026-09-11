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

const config: CapacitorConfig = {
  appId: "com.luku.app",
  appName: "Luku",
  webDir: "capacitor/www",
  android: {
    // Necessário quando `CAP_SERVER_URL` é http:// (servidor de dev na LAN).
    allowMixedContent: true,
  },
  server: {
    androidScheme: "https",
    ...(serverUrl ? { url: serverUrl, cleartext: serverUrl.startsWith("http://") } : {}),
  },
};

export default config;
