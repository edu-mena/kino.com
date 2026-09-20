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

## Push Android (FCM)

O sino de notificações + push já funcionam de ponta a ponta na web (Web
Push, VAPID — ver `src/lib/push-notifications.tsx`). Na app nativa
(Android/iOS) o código também já está todo pronto (plugin
`@capacitor/push-notifications`, endpoint `/device-tokens`, envio via
Firebase Cloud Messaging em `backend/app/Services/PushNotificationService.php`)
— falta só a configuração externa (projeto Firebase + `google-services.json`)
que **não dá para fazer a partir daqui**, mesma situação do login Google
nativo acima.

### 1. Criar/reaproveitar um projeto Firebase

[Firebase Console](https://console.firebase.google.com) → "Adicionar
projeto". Pode ser um projeto novo só para push, ou o mesmo projeto do
Google Cloud já usado para o login Google (`GOOGLE_WEB_CLIENT_ID` etc.) —
Firebase e Google Cloud Console partilham o mesmo projeto por baixo, ligar
um ao Firebase não interfere com o OAuth já configurado.

### 2. Registar a app Android no Firebase

Dentro do projeto Firebase → "Adicionar app" → Android:

- **Nome do pacote**: `com.luku.app` (tem de ser exatamente este, é o
  `applicationId` em `android/app/build.gradle`).
- SHA-1: opcional para push em si (só é preciso para Dynamic Links/App
  Check, não usados aqui) — pode saltar esse passo.
- Descarrega o `google-services.json` gerado.

### 3. Colocar o `google-services.json`

```
android/app/google-services.json
```

`android/app/build.gradle` já tem o bloco condicional que ativa o plugin
`com.google.gms.google-services` sozinho assim que este ficheiro existir
(gerado pelo próprio Capacitor ao sincronizar o plugin de push — nada a
mexer aí). Depois:

```sh
npm run cap:sync
```

**Atenção**: `android/` está no `.gitignore` (regenera-se com `npx cap add
android`) — se a pasta for apagada/recriada do zero, o `google-services.json`
tem de ser copiado para lá de novo (guarda o ficheiro original nalgum
sítio fora do repo, ex. o gestor de passwords da equipa — é uma
credencial, mesmo sendo só do lado do cliente).

### 4. Gerar a credencial do lado do SERVIDOR

O backend envia a notificação em si (não o telemóvel que "puxa" sozinho) —
precisa de uma conta de serviço do MESMO projeto Firebase:

Firebase Console → ⚙️ Definições do projeto → **Contas de serviço** →
"Gerar nova chave privada" → descarrega um ficheiro `.json`.

Esse ficheiro (o conteúdo JSON inteiro, não o caminho) vai para a variável
`FIREBASE_CREDENTIALS` do backend:

```sh
# local (backend/.env) — cola o JSON todo numa linha só
FIREBASE_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"...", ...}'

# produção (Fly.io)
fly secrets set FIREBASE_CREDENTIALS='{"type":"service_account", ...}' -a luku-api
```

Sem isto configurado, o envio Android fica em no-op silencioso — o resto
da app continua a funcionar normalmente (mesmo comportamento do Web Push
sem `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`).

### 5. Testar

```sh
npm run android:run
```

Ativa o toggle de notificações em `/perfil` dentro da app — deve pedir
permissão do sistema e, se aceite, registar o token (`POST
/device-tokens`, `platform: "android"`). Cria/atualiza um pedido desse
utilizador (via `/admin/pedidos` de outro dispositivo/browser, por
exemplo) para confirmar que a notificação chega ao telemóvel.

### iOS — falta ainda mais um passo (APNs)

O mesmo plugin cobre iOS, e o `PushNotificationController`/`device_tokens`
já aceitam `platform: "ios"`, mas `PushNotificationService` só envia para
`web`/`android` por agora — enviar para iOS precisa de uma chave APNs
(Apple Developer → Certificates, Identifiers & Profiles → Keys) associada
ao mesmo projeto Firebase (Firebase Console → Definições do projeto → Cloud
Messaging → carregar a chave `.p8` da Apple). Depois disso, o SDK do
Firebase (`kreait/firebase-php`, já instalado) consegue enviar tanto para
Android como iOS pelo mesmo `sendMulticast` — só falta o código distinguir
o `AndroidConfig`/`ApnsConfig` por mensagem, e a credencial Apple em si.

---

## Partilhar um documento PARA a app (comprovativo/fatura)

Permite que a Luku apareça na folha de partilha nativa do telemóvel — ex.
partilhar o PDF/imagem dum comprovativo a partir doutra app (banco/carteira
digital) direto para a Luku, que depois pergunta a que pedido anexar (ver
`src/lib/pending-share.tsx` + `src/components/pending-share-dialog.tsx`).
Plugin: `@capgo/capacitor-share-target`.

### Android — já feito, nada a fazer aqui

`AndroidManifest.xml` já tem o `intent-filter` para `image/*`/`application/pdf`
dentro da `MainActivity`. `MainActivity.java` ficou tal e qual estava (uma
classe vazia) — o `BridgeActivity` de que estende já chama `onNewIntent(getIntent())`
sozinho no arranque (dentro do próprio `load()`), por isso o arranque a frio
via "Partilhar" já funciona sem código nenhum a mais; cheguei a adicionar um
reencaminhamento manual aqui, mas processava o intent a dobrar — removido.
**Atenção**: `android/` está no `.gitignore` — se a pasta for alguma vez
apagada/regenerada do zero (`npx cap add android` de novo), o `intent-filter`
do manifest tem de ser reposto (ver o histórico do repo ou o commit que o
introduziu).

### iOS — só em Mac, e precisa de código próprio (não é só configuração)

Ao contrário do login Google acima, este plugin **não vem pronto a usar no
iOS** — a documentação oficial só cobre a criação do alvo, App Groups e
`capacitor.config.ts`; o código Swift que efetivamente lê o ficheiro
partilhado fica por conta de quem integra (a própria documentação do
plugin admite isto, remetendo para "exemplos nas issues" do repositório
que não estão publicados num sítio fixo). Passos:

1. **Criar o alvo** — Xcode → `File → New → Target` → **Share Extension**
   → nome sugerido `ShareExtension` → Finish.
2. **App Groups** — no target `App` **e** no novo `ShareExtension`:
   `Signing & Capabilities → + Capability → App Groups` → adicionar
   `group.com.luku.app` aos dois.
3. **`capacitor.config.ts`** (raiz do repo) — acrescentar:
   ```ts
   const config: CapacitorConfig = {
     // ...o que já lá está
     plugins: {
       CapacitorShareTarget: {
         appGroupId: "group.com.luku.app",
       },
     },
   };
   ```
   Depois `npm run cap:sync`.
4. **URL scheme** — `Info.plist` da app principal (`ios/App/App/Info.plist`)
   precisa de um `CFBundleURLTypes`/`CFBundleURLSchemes` próprio (ex.
   `com.luku.app`) — é o que o `ShareViewController` usa para reabrir a app
   principal depois de guardar o ficheiro partilhado. Se já existir um
   scheme aí (confirmar se o login Google não usa a mesma chave — os dois
   podem coexistir em entradas separadas de `CFBundleURLTypes`), reutilizar;
   senão criar um novo dict no array.
5. **`ShareViewController.swift`** (dentro do alvo `ShareExtension`,
   ficheiro gerado automaticamente pelo template) — substituir o conteúdo
   gerado por código que:
   - Lê o `NSExtensionItem`/`NSItemProvider` recebido (imagem ou PDF —
     `public.image` / `com.adobe.pdf` nos `UTType` a aceitar).
   - Guarda o ficheiro em `UserDefaults(suiteName: "group.com.luku.app")`
     sob a chave `"share-target-data"` (nome/mime/dados — o `SharedFile`
     que o lado JS espera, ver `definitions.d.ts` do pacote em
     `node_modules/@capgo/capacitor-share-target`).
   - Chama `.synchronize()` e reabre a app principal pelo URL scheme do
     passo 4.
   - **Não há um snippet oficial completo para colar** — ao chegar a este
     passo no Mac, o mais rápido é abrir as _issues_ do repositório
     (`github.com/Cap-go/capacitor-share-target`) à procura de um exemplo
     de `ShareViewController`, ou adaptar um tutorial genérico de "iOS
     Share Extension + App Group" (o mecanismo é standard da Apple, só o
     nome da chave/`suiteName` acima é específico deste plugin).
6. **`NSExtension` no `Info.plist` do `ShareExtension`** — as regras de
   ativação (`NSExtensionActivationRule`) que decidem quando a Luku aparece
   na folha de partilha vêm com um valor genérico no template do Xcode
   (aceita quase tudo); trocar por algo que aceite só imagem e PDF, ex.:
   ```xml
   <key>NSExtensionAttributes</key>
   <dict>
     <key>NSExtensionActivationRule</key>
     <dict>
       <key>NSExtensionActivationSupportsImageWithMaxCount</key>
       <integer>1</integer>
       <key>NSExtensionActivationSupportsFileWithMaxCount</key>
       <integer>1</integer>
     </dict>
   </dict>
   ```
   (`NSExtensionActivationSupportsFileWithMaxCount` cobre o PDF — a Apple
   não distingue por extensão nesta chave simples; se aparecer para tipos
   de ficheiro indesejados, é preciso a variante `NSExtensionActivationRule`
   como _predicate string_, mais granular.)
7. Testar no simulador/dispositivo: partilhar uma foto (Fotos → Partilhar)
   ou um PDF (Ficheiros → Partilhar) e confirmar que "Luku" aparece na
   lista e que o `PendingShareDialog` abre com o ficheiro certo.

---

## Ícone e nome

- Nome apresentado: `appName` em `capacitor.config.ts` (re-sync depois).
- Ícones/splash: fonte em `resources/icon.png` (quadrado, fundo opaco —
  usado tal qual para o ícone) e `resources/splash.png` (mesma marca, mas
  com fundo **transparente** — sem isto a splash em modo escuro fica com um
  quadrado branco à volta do logo). Ambos gerados a partir de
  `src/assets/iconapp.png` nesta sessão; para regenerar do zero (ex.: nova
  versão da marca, ou depois de `npx cap add android` recriar `android/`):
  ```sh
  npx capacitor-assets generate --android \
    --splashBackgroundColor "#FFFFFF" --splashBackgroundColorDark "#0F1B12" \
    --iconBackgroundColor "#FFFFFF" --iconBackgroundColorDark "#0F1B12"
  ```
  (`resources/splash.png` precisa mesmo de transparência à volta do "u" —
  um PNG com fundo branco opaco fica com essa mesma faixa branca colada por
  cima do fundo escuro. Script usado para remover o fundo branco do
  `iconapp.png` original via `sharp`, caso seja preciso repetir a partir de
  outro logo: ver histórico do commit que introduziu `resources/`.)

---

## Assinatura de release (Android)

O keystore de produção (`luku-release.keystore`, na raiz do repo, **nunca
comitado** — ver `.gitignore`) assina todas as atualizações publicadas na
Play Store: perdê-lo ou trocá-lo obriga a publicar a app como um produto
novo, do zero, sem histórico/instalações antigas. A password vive em
`android/keystore.properties` (também gitignorado — `android/` inteiro
está fora do git, ver nota acima), lido por `android/app/build.gradle`
— **nunca** hardcoded diretamente no `build.gradle` (era assim antes,
corrigido nesta sessão; evitar repetir o hábito se `android/` for
regenerado). Formato de `android/keystore.properties`:

```properties
storeFile=C:/Projects/_Kino.com/luku-release.keystore
storePassword=...
keyAlias=luku
keyPassword=...
```

Sem este ficheiro, `./gradlew bundleRelease`/`assembleRelease` falha (ou
gera um `.aab`/APK sem assinatura de release, que a Play Store rejeita).

---

## Depois de mexer na config ou instalar plugins Capacitor

```sh
npm run cap:sync        # copia webDir + aplica capacitor.config + plugins
```

## Limitações deste modo (invólucro sobre servidor)

- Precisa de rede para o servidor configurado — **não é offline**.
- Para a submissão à App Store convém, mais tarde, um **bundle SPA/prerender**
  do TanStack Start empacotado na app (ver o documento de infraestrutura).
- Plugins nativos ainda por integrar (câmara, geolocalização) instalam-se à
  parte quando forem precisos, depois `cap:sync`. Push (`@capacitor/push-notifications`)
  já está integrado — ver secção "Push Android (FCM)" acima.
