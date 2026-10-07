#!/bin/sh
# Ponto de entrada único partilhado por todos os process groups do
# fly.toml (app/worker/reverb/scheduler) — cada um passa o SEU comando
# como argumento (ver [processes] no fly.toml), este script só o executa.
# Migrações NÃO correm aqui (correriam em duplicado — 1x por process
# group arrancado); correm em [deploy].release_command no fly.toml,
# que o Fly garante executar exatamente uma vez por deploy.
set -e

# Cache de config/eventos/rotas/views — sem isto o Laravel relia toda a
# config e registava ~200 rotas em CADA pedido (medido: ~0,8s de tempo de
# servidor por pedido, com a base de dados a 2,5ms). Tem de ser aqui, no
# arranque, e não no build da imagem: a config em cache congela o env do
# momento, e os secrets do Fly só existem com a máquina a correr.
# Se falhar, arranca na mesma sem cache (mais lento, mas no ar) — e limpa
# só estas caches, nunca `optimize:clear`/`cache:clear` (esvaziavam o Redis
# partilhado: sessões e limites de pedidos).
if ! php artisan optimize >/dev/null 2>&1; then
    echo "aviso: php artisan optimize falhou — a arrancar sem cache de config/rotas" >&2
    php artisan config:clear >/dev/null 2>&1 || true
    php artisan route:clear >/dev/null 2>&1 || true
    php artisan event:clear >/dev/null 2>&1 || true
fi

exec "$@"
