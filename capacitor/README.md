# Kino — app Android (Capacitor)

O Kino é uma app **SSR** (TanStack Start). Não há um bundle estático offline,
por isso a app Android é um **invólucro nativo que carrega um servidor a
correr** — o servidor de `npm run dev` na rede local, ou um ambiente
publicado. Chega para testar o produto como aplicativo (splash, ícone,
botão «voltar» do Android, base para push/GPS mais tarde).

- `appId`: `com.kino.app` · `appName`: `Kino`
- Projeto nativo em `android/` — **não versionado** (regenera-se com
  `npx cap add android`). Config em `capacitor.config.ts` (raiz).

---

## O que instalar (uma vez)

1. **JDK 17** (Temurin/Adoptium ou o que vem com o Android Studio).
2. **Android Studio** — inclui o Android SDK, plataformas e um emulador.
   Alternativa sem IDE: `commandlinetools` + `sdkmanager`.
3. Definir `ANDROID_HOME` (ou `ANDROID_SDK_ROOT`) e ter `platform-tools` no
   `PATH` (`adb`).
4. Um dispositivo Android com **depuração USB** ligada, ou um emulador (AVD)
   criado no Android Studio.

Confirmar: `java -version`, `adb devices`.

---

## Testar contra o servidor de dev (LAN)

Telemóvel e PC têm de estar na **mesma rede Wi-Fi**.

```sh
# 1. Servidor de dev acessível na rede (não só localhost)
npm run dev -- --host 0.0.0.0
#    anota o IP da máquina (ipconfig / ifconfig) e a PORTA que o Vite imprime

# 2. Aponta a app a esse endereço e sincroniza
CAP_SERVER_URL=http://192.168.1.194:5173 npm run cap:sync
#    (Windows PowerShell:  $env:CAP_SERVER_URL="http://192.168.1.194:5173"; npm run cap:sync)

# 3. Corre no dispositivo/emulador ligado
npm run android:run
#    ou abre no Android Studio e carrega em Run:
npm run android:open
```

Alterar o endereço = repetir os passos 2–3 com o novo `CAP_SERVER_URL`.
Sem `CAP_SERVER_URL`, a app mostra um aviso de configuração (`capacitor/www`).

> `http://` na LAN funciona porque `capacitor.config.ts` liga `cleartext`
> quando o URL não é `https`. Para um build de produção usa sempre `https://`.

---

## Testar contra um ambiente publicado

```sh
CAP_SERVER_URL=https://staging.kino.com npm run cap:sync
npm run android:run
```

---

## Gerar um APK para partilhar (teste interno)

```sh
cd android
./gradlew assembleDebug          # Windows: gradlew.bat assembleDebug
# APK em: android/app/build/outputs/apk/debug/app-debug.apk
```

Instalar num dispositivo: `adb install -r app-debug.apk`.
Para distribuir por mais gente, usa o **canal de teste interno** da Play
Console (precisa de um `.aab` assinado — passo posterior).

---

## Ícone e nome

- Nome apresentado: `appName` em `capacitor.config.ts` (re-sync depois).
- Ícones/splash: gerar com `@capacitor/assets`
  (`npx @capacitor/assets generate --android`, a partir de um PNG 1024×1024)
  ou substituir à mão em `android/app/src/main/res/mipmap-*`.

---

## Depois de mexer na config ou instalar plugins Capacitor

```sh
npm run cap:sync        # copia webDir + aplica capacitor.config + plugins
```

## Limitações deste modo (invólucro sobre servidor)

- Precisa de rede para o servidor configurado — **não é offline**.
- Para a submissão à App Store convém, mais tarde, um **bundle SPA/prerender**
  do TanStack Start empacotado na app (ver o documento de infraestrutura).
- Plugins nativos (push, câmara, geolocalização) instalam-se à parte quando
  forem precisos: `npm i @capacitor/push-notifications` etc., depois `cap:sync`.
