# Luku — app Android + iOS (Capacitor)

O Luku é uma app **SSR** (TanStack Start). Não há um bundle estático offline,
por isso a app é um **invólucro nativo que carrega um servidor a
correr** — o servidor de `npm run dev` na rede local, ou um ambiente
publicado. Chega para testar o produto como aplicativo (splash, ícone,
botão «voltar» do Android, base para push/GPS mais tarde).

- `appId`: `com.luku.app` · `appName`: `Luku`
- Projeto nativo Android em `android/`, iOS em `ios/` — **nenhum dos dois
  versionado** (regeneram-se com `npx cap add android` / `npx cap add
  ios`). Config comum em `capacitor.config.ts` (raiz).
- **iOS precisa de Xcode + macOS** — nada disto (adicionar o projeto,
  compilar, correr no simulador/dispositivo) é possível numa máquina só
  Windows; só quem tiver Mac consegue os passos de `ios/` abaixo.

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

### iOS (só em Mac)

1. **Xcode** (App Store) + **Command Line Tools** (`xcode-select
   --install`).
2. **CocoaPods** (`sudo gem install cocoapods`) — Capacitor usa-o para as
   dependências nativas do projeto iOS.
3. `npx cap add ios` (uma vez, na raiz do repo) — cria `ios/`.
4. Simulador (já vem com o Xcode) ou um iPhone com **modo developer**
   ativado, ligado por cabo, com a tua Apple ID como signing team no
   projeto (Xcode → target `App` → Signing & Capabilities).

Confirmar: `xcodebuild -version`, `pod --version`.

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

# iOS (Mac) — os mesmos passos 1-2 acima, depois:
npm run ios:run
#    ou abre no Xcode e carrega em Run (▶):
npm run ios:open
```

Alterar o endereço = repetir os passos 2–3 com o novo `CAP_SERVER_URL`.
Sem `CAP_SERVER_URL`, a app mostra um aviso de configuração (`capacitor/www`).

> `http://` na LAN funciona porque `capacitor.config.ts` liga `cleartext`
> quando o URL não é `https`. Para um build de produção usa sempre `https://`.

---

## Testar contra um ambiente publicado

```sh
CAP_SERVER_URL=https://staging.luku.com npm run cap:sync
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

## Login com Google (nativo)

O login de cliente (`/entrar`) usa dois caminhos diferentes conforme a
plataforma (ver `src/lib/google-identity.ts` + `src/lib/auth.tsx`,
`loginWithGoogle`):

- **Web**: popup do Google Identity Services (JS) — já funciona, nada a
  configurar além do que já existe.
- **App nativa (Android/iOS)**: SDK nativo via
  `@capawesome/capacitor-google-sign-in`. **Obrigatório** — o popup web
  acima não funciona dentro da WebView do Capacitor (o Google bloqueia
  OAuth em WebViews embutidas, erro `disallowed_useragent`).

O caminho nativo pede configuração fora do código (Google Cloud Console +
ficheiros nativos) que **não dá para fazer a partir daqui** — só quem tiver
acesso ao projeto no Google Cloud Console e (para iOS) a um Mac com Xcode.
Passos:

### 1. Google Cloud Console

Confirmar que existem 3 **OAuth 2.0 Client IDs** no mesmo projeto (Credenciais
→ Criar credenciais → ID do cliente OAuth) — os mesmos 3 que o backend já
espera em `GOOGLE_WEB_CLIENT_ID`/`GOOGLE_ANDROID_CLIENT_ID`/
`GOOGLE_IOS_CLIENT_ID` (ver `backend/.env.example`):

- **Web** — o que já existe (`VITE_GOOGLE_WEB_CLIENT_ID` no frontend). É
  este que entra em `GoogleSignIn.initialize({ clientId })` em
  **todas** as plataformas, incluindo Android/iOS (é o "server client
  id" que o SDK nativo usa para emitir um `id_token` com a audiência
  certa — o client id específico da plataforma abaixo serve só para o
  próprio SO validar a app, nunca entra em JS).
- **Android** — tipo "Android". Nome do pacote: `com.luku.app`. SHA-1:
  ```sh
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
  (debug; para produção repetir com a keystore de release — ver
  `luku-release.keystore` na raiz).
- **iOS** — tipo "iOS". Bundle ID: `com.luku.app`.

### 2. Android — nada mais a fazer

O client id Android acima só precisa de existir e ter o SHA-1 certo — o
plugin usa o Credential Manager do Google Play Services, que já resolve
tudo a partir do `clientId` (web) passado em JS + o pacote/assinatura da
app. Sem passos extra em `android/`.

### 3. iOS — editar `ios/App/App/Info.plist`

```xml
<key>GIDClientID</key>
<string>SUBSTITUIR_PELO_IOS_CLIENT_ID.apps.googleusercontent.com</string>

<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.googleusercontent.apps.SUBSTITUIR_PELO_IOS_CLIENT_ID</string>
    </array>
  </dict>
</array>
```

(o valor de `CFBundleURLSchemes` é o iOS client id **invertido**, só a
parte antes de `.apps.googleusercontent.com` — ex.:
`123-abc.apps.googleusercontent.com` → scheme
`com.googleusercontent.apps.123-abc`.)

Mais fácil de editar no próprio Xcode (clicar em `Info.plist` no
navegador do projeto) do que à mão.

### 4. Depois de qualquer mudança acima

```sh
npm run cap:sync
```

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
