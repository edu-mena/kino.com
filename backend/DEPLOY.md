# Deploy — visão geral

Dois ambientes, propositadamente separados e sem dependência um do outro:

| | Demo (apresentação a restaurantes) | Produção real |
|---|---|---|
| Domínio | `*.vercel.app` (gratuito) | `luku.ao` (comprado na Hostinger, DNS aponta para fora) |
| Frontend | Vercel | Vercel ou Cloudflare Workers (já configurado) — mesmo build, domínio diferente |
| Backend | **nenhum** — tudo mock/localStorage | Fly.io (`backend/fly.toml` + `Dockerfile.prod`, região `jnb`) |
| Base de dados | nenhuma (localStorage do browser) | Postgres gerido pelo Fly |
| Risco se cair | zero (é só um site estático) | pedidos/reservas reais dependem disto |

A Hostinger continua a ser só o **registo do domínio** `luku.ao` — o plano StartUp (partilhado) não corre Postgres/Redis/filas persistentes, então o backend corre no Fly.io e o DNS do domínio é só apontado para lá (CNAME/A record no hPanel da Hostinger). Isto é normal e comum — comprar domínio num sítio e hospedar noutro.

## 1. Demo em `*.vercel.app` (sem backend)

Pré-requisito de código: hoje o login com Google (`loginWithGoogle` em `src/lib/auth.tsx`) não tem fallback — se não houver `VITE_API_BASE_URL` a responder, o clique em "Continuar com Google" mostra erro. Antes de publicar a demo, preciso de adicionar um modo "sem backend" que deixe entrar com um utilizador fictício quando `VITE_API_BASE_URL` está vazia — digam-me quando quiserem que eu implemente isto, é um trabalho pequeno e isolado do resto.

Passos (sem essa correção, o resto do site — restaurantes/menu/pedidos/reservas/stories — já funciona 100% em mock, só o login fica por resolver):

1. `vercel.com` → "Import Project" → repositório GitHub deste projeto, root do projeto = raiz do repo (não `backend/`).
2. Build command: `npm run build`. Output: o que o adapter Vite/Nitro gerar (o projeto já builda para Cloudflare hoje — pode ser necessário trocar o preset do Nitro para `vercel` no `vite.config.ts`/`app.config`; confirmar isto no primeiro deploy).
3. **Não definir** `VITE_API_BASE_URL` nas env vars da Vercel — isso é o que mantém a demo 100% mock.
4. Deploy. URL fica em `<projeto>.vercel.app`.

## 2. Backend real no Fly.io

Ficheiros já preparados neste commit: `fly.toml`, `Dockerfile.prod`, `docker/prod/*`, `.env.production.example` (checklist de secrets, não um `.env` para copiar). Ainda não testado contra uma conta Fly real — o ambiente onde estou a trabalhar não tem acesso a executar `flyctl` contra a tua conta, por isso os passos abaixo têm de ser corridos por ti (ou numa sessão à qual dês acesso/CLI autenticado).

```bash
# 1. Instalar e autenticar
curl -L https://fly.io/install.sh | sh
fly auth login

# 2. Criar a app (nome tem de ser único globalmente — ajustar em fly.toml também)
cd backend
fly launch --no-deploy --copy-config --name luku-api --region jnb

# 3. Base de dados gerida
fly postgres create --name luku-api-db --region jnb
fly postgres attach luku-api-db -a luku-api
# ^ isto imprime uma connection string — copiar para o secret DB_URL:
fly secrets set DB_URL="postgres://...valor impresso acima..." -a luku-api

# 4. Redis gerido (Upstash via Fly)
fly redis create --name luku-api-redis --region jnb
# idem — copiar a REDIS_URL impressa:
fly secrets set REDIS_URL="rediss://...valor impresso..." -a luku-api

# 5. Resto dos secrets — preencher .env.production.example e aplicar cada
#    linha não vazia (APP_KEY, AWS_*, GOOGLE_*, MAIL_*, REVERB_*, etc.):
fly secrets set APP_KEY="base64:..." -a luku-api
fly secrets set AWS_ACCESS_KEY_ID="..." AWS_SECRET_ACCESS_KEY="..." -a luku-api
# ...e assim para cada variável do .env.production.example com valor em falta

# 6. Seeds essenciais (payment-methods, delivery-policy, operador de sistema,
#    conteúdo institucional Luku) — uma vez, após o primeiro deploy:
fly ssh console -a luku-api -C "php artisan db:seed --force"

# 7. Deploy
fly deploy -a luku-api
```

O `release_command` no `fly.toml` corre `php artisan migrate --force` automaticamente em cada deploy — não é preciso correr migrations à mão depois do primeiro `db:seed`.

**Apontar `luku.ao`**: no hPanel da Hostinger, DNS da zona `luku.ao` → adicionar registo `CNAME api → luku-api.fly.dev` (ou o hostname que o Fly atribuir), depois `fly certs add api.luku.ao -a luku-api` para o TLS automático. O frontend real (`VITE_API_BASE_URL=https://api.luku.ao/api/v1`) fica apontado para aqui — noutro registo DNS (`@`/`www`) aponta-se o domínio principal para onde o frontend de produção estiver deployado.

**Não testado de ponta a ponta** (fica registado para não esquecer): nenhum destes ficheiros foi ainda validado contra uma conta Fly real — a imagem `Dockerfile.prod` builda a partir do mesmo `composer.json`/código já testado localmente, mas o primeiro `fly deploy` real é o teste de fogo. Recomendo correr os passos 1-7 numa tarde calma, não em cima da hora de uma apresentação.

---

## 3. Como a comunicação funciona (a pergunta de fundo)

**Frontend ↔ Backend**: uma única regra — a app lê a variável `VITE_API_BASE_URL` (ver `.env.example` na raiz do repo) e todo pedido de rede passa por `src/lib/api-client.ts`, que monta `${VITE_API_BASE_URL}${path}` e injeta o `Authorization: Bearer <token>` quando há sessão. Não há URLs hardcoded espalhadas pelo código — mudar de ambiente (dev/demo/produção) é só trocar essa variável no momento do build, nunca editar código-fonte. Hoje só os 3 ecrãs de login usam isto a sério; ligar o resto (restaurantes/pedidos/reservas/etc.) ao backend real é o próximo grande passo quando decidirem avançar (ver `MEMORY.md` — foi adiado a pedido teu depois da Fase 7, em favor de mais backend).

**Backend ↔ Base de dados**: o Laravel fala com o Postgres via Eloquent ORM — nenhum SQL cru espalhado pelos controllers, o que torna trivial trocar de Postgres local (dev) para o Postgres gerido do Fly (produção): é outra variável de ambiente (`DB_URL`), zero mudança de código.

**Como atualizar depois de publicado — a distinção importa**:
- **Frontend web** (Vercel/Cloudflare): cada `git push` → novo deploy → todos os visitantes veem a versão nova no refresh seguinte. Instantâneo, sem fricção, sem aprovação de terceiros.
- **Backend** (Fly.io): idem, `fly deploy` → nova versão ao vivo em segundos, sem o cliente precisar fazer nada — é por isto que a versão do backend é `/api/v1` no caminho: se um dia for preciso um `/api/v2` incompatível, o `v1` continua a responder em paralelo até todos os clientes migrarem, em vez de partir alguém de repente.
- **App mobile nativa** (quando existir, Android/iOS via Capacitor — já há `cap:sync`/`cap:open` no `package.json`): aqui a atualização **não é instantânea** — muda o binário na loja (Google Play/App Store), sujeito a revisão, e cada utilizador só recebe quando atualiza a app. É por isto que o backend deve manter-se compatível com versões antigas de app por um tempo (mesma razão do versionamento `/api/v1`), e por isto que a comunicação em tempo real (notificações) foi desenhada para nunca depender de uma versão nova de app — só de o backend, que é sempre atualizável na hora.

Resumindo a "generalizada vs singular": uma mudança de **backend** é sempre geral (afeta todos os clientes ao mesmo tempo, web e mobile, assim que fizeres deploy); uma mudança de **app mobile** é singular por natureza (cada utilizador atualiza no seu tempo) — e o versionamento de API existe exatamente para a diferença entre as duas nunca partir ninguém.
