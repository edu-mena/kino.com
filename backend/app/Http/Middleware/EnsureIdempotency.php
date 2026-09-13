<?php

namespace App\Http\Middleware;

use App\Models\IdempotencyKey;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Exige e aplica o cabeçalho `Idempotency-Key` nos POSTs de orders/
 * reservations (clientes mobile retentam em rede instável; sem isto um
 * retry duplica o pedido — ver plano/migration idempotency_keys). Só nas
 * rotas onde é aplicado explicitamente (`->middleware('idempotent')`), não
 * globalmente — GETs e a maioria dos POSTs não precisam disto.
 */
class EnsureIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('Idempotency-Key');

        if (! $key || ! preg_match('/^[0-9a-f-]{36}$/i', $key)) {
            return response()->json([
                'message' => 'O cabeçalho Idempotency-Key (UUID) é obrigatório nesta operação.',
            ], 400);
        }

        $ownerKey = $request->user()
            ? 'user:'.$request->user()->id
            // Sem user autenticado (checkout de convidado) ainda não existe
            // guest_token neste ponto (só nasce ao gravar o recurso) — o IP
            // é uma partição best-effort, não uma fronteira de segurança: a
            // entropia real que evita duplicados é o próprio Idempotency-Key
            // (UUID gerado pelo cliente), não isto.
            : 'guest_ip:'.$request->ip();
        $endpoint = $request->method().' '.$request->path();

        // Lock consultivo do Postgres, chave = hash da tripla — serializa
        // pedidos idênticos concorrentes (o 2º espera o 1º acabar) em vez
        // de deixar os dois executarem a lógica de negócio e só descobrir o
        // duplicado depois (o que já teria criado 2 encomendas na BD; só um
        // SELECT-antes-de-INSERT, sem lock, NÃO é idempotente sob
        // concorrência real). `pg_advisory_xact_lock` liberta-se sozinho no
        // fim da transação, nunca fica preso.
        return DB::transaction(function () use ($request, $next, $ownerKey, $key, $endpoint) {
            DB::statement('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', ["{$ownerKey}|{$key}|{$endpoint}"]);

            $existing = IdempotencyKey::query()
                ->where('owner_key', $ownerKey)
                ->where('idempotency_key', $key)
                ->where('endpoint', $endpoint)
                ->first();

            if ($existing) {
                return response()->json($existing->response_body, $existing->response_status)
                    ->header('Idempotency-Replayed', 'true');
            }

            /** @var Response $response */
            $response = $next($request);
            $body = json_decode($response->getContent() ?: '{}', true) ?? [];

            IdempotencyKey::query()->create([
                'owner_key' => $ownerKey,
                'idempotency_key' => $key,
                'endpoint' => $endpoint,
                'response_status' => $response->getStatusCode(),
                'response_body' => $body,
            ]);

            return $response;
        });
    }
}
