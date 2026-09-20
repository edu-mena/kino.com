# Ambiente de teste local partilhado

Testa o Luku com **várias pessoas/dispositivos na mesma rede Wi-Fi**, todos a
ver os **mesmos dados mock** (restaurantes, pedidos, reservas, avaliações,
stories, notificações, etc.) — sem precisar do backend real (Postgres/Redis/
`php artisan serve`), só este servidor leve + o frontend.

**Login continua por dispositivo**: cada pessoa entra com a conta que
quiser no seu telemóvel/PC — só os DADOS partilham, não a sessão.

**Completamente isolado** do resto do projeto: não mexe em nenhuma store
mock existente, no backend PHP, nem no `hasRealBackend`/demo do Vercel
(esse continua 100% igual, sempre). Zero dependências novas — só
`node:http`/`node:fs`.

## Como correr

```sh
# Terminal 1 — o teu PC como "servidor" (fica ligado durante o teste todo)
npm run mock-server

# Terminal 2 — frontend, apontado ao servidor partilhado pelo IP da tua
# máquina na rede local (ipconfig / ifconfig para descobrir; mesma ideia
# do CAP_SERVER_URL usado no teste do Capacitor)
VITE_SHARED_MOCK_URL=http://192.168.1.194:4001 npm run dev -- --host 0.0.0.0
```

Cada dispositivo na mesma rede acede ao IP:porta que o Vite imprimir
(normalmente `:5173` ou `:8081`, ver o output do terminal 2). O
`mock-server` grava o estado em `mock-server/state.json` (gitignorado) —
reiniciá-lo a meio do teste não perde nada do que já foi testado.

## Como funciona (para quem for mexer nisto depois)

O frontend continua a ler/escrever `localStorage` exatamente como sempre
(nenhuma das ~35 stores em `src/data`/`src/lib` sabe que isto existe). O
módulo `src/lib/shared-mock-sync.ts`, ativado só quando
`VITE_SHARED_MOCK_URL` está definida, intercepta
`localStorage.setItem`/`removeItem` uma única vez no arranque da app:
cada escrita local é replicada para este servidor (`PUT /state/:chave`), e
um poll a cada ~2s traz as escritas feitas por OUTROS dispositivos de
volta para o `localStorage` local, disparando os mesmos eventos
(`storage` nativo + `CHANGE_EVENT` próprio da app) que as stores já ouvem
— por isso a UI atualiza sozinha, sem código novo em cada store.

Sessão/login (`authUser`/`systemOperator`/`restaurantAdmin`) fica de fora
de propósito, ver `src/data/storage-keys.ts` (`STORAGE_KEYS`).

## Endpoints

- `GET /state` — snapshot completo `{ chave: valor }`.
- `PUT /state/:chave` — corpo = novo valor (texto).
- `DELETE /state/:chave` — remove a chave.

Sem autenticação/HTTPS — é um servidor de teste na tua rede local, nunca
exposto à internet.
