#!/bin/sh
# Ponto de entrada único partilhado por todos os process groups do
# fly.toml (app/worker/reverb/scheduler) — cada um passa o SEU comando
# como argumento (ver [processes] no fly.toml), este script só o executa.
# Migrações NÃO correm aqui (correriam em duplicado — 1x por process
# group arrancado); correm em [deploy].release_command no fly.toml,
# que o Fly garante executar exatamente uma vez por deploy.
set -e
exec "$@"
