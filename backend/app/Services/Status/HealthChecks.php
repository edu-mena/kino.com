<?php

namespace App\Services\Status;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;
use Laravel\Horizon\Contracts\MasterSupervisorRepository;
use Throwable;

/**
 * As verificações internas por trás da página de estado. Cada uma corre
 * isolada (uma exceção numa nunca impede as outras) e devolve sempre o erro
 * exato — esse texto só chega ao operador (email/painel de sistema), nunca à
 * API pública.
 */
class HealthChecks
{
    /** @return array<string, array{ok: bool, error: ?string, ms: int}> */
    public function run(): array
    {
        return [
            'database' => $this->measure(fn () => DB::select('select 1')),
            'cache' => $this->measure(fn () => $this->checkCache()),
            'queue' => $this->measure(fn () => $this->checkQueue()),
            'web' => $this->measure(fn () => $this->checkUrl((string) config('status.web_url'))),
            'api' => $this->measure(fn () => $this->checkUrl((string) config('status.api_url'))),
        ];
    }

    /** @return array{ok: bool, error: ?string, ms: int} */
    private function measure(callable $check): array
    {
        $start = hrtime(true);
        try {
            $check();
            $result = ['ok' => true, 'error' => null];
        } catch (Throwable $e) {
            $result = ['ok' => false, 'error' => $this->describe($e)];
        }

        return $result + ['ms' => (int) ((hrtime(true) - $start) / 1_000_000)];
    }

    private function checkCache(): void
    {
        $key = 'status-check:'.bin2hex(random_bytes(4));
        Cache::put($key, 'ok', 10);
        if (Cache::pull($key) !== 'ok') {
            throw new \RuntimeException('A cache aceitou a escrita mas não devolveu o valor.');
        }
    }

    /** Com Redis (produção) a fila é o Horizon: tem de haver pelo menos um
     * supervisor vivo, senão os trabalhos (push, emails) ficam parados. */
    private function checkQueue(): void
    {
        $default = config('queue.default');
        $usesRedis = $default === 'redis'
            || ($default === 'failover' && in_array('redis', (array) config('queue.connections.failover.connections'), true));
        if (! $usesRedis) {
            return; // `sync`/`database`: sem processo separado a vigiar
        }

        Redis::connection()->ping();

        if (app(MasterSupervisorRepository::class)->all() === []) {
            throw new \RuntimeException('Nenhum supervisor do Horizon ativo — a fila não está a ser processada.');
        }
    }

    private function checkUrl(string $url): void
    {
        $response = Http::timeout((int) config('status.http_timeout', 8))
            ->withHeaders(['User-Agent' => 'LukuStatusMonitor/1.0'])
            ->get($url);

        if (! $response->successful()) {
            throw new \RuntimeException("HTTP {$response->status()} em {$url}");
        }
    }

    private function describe(Throwable $e): string
    {
        return class_basename($e).': '.mb_strimwidth($e->getMessage(), 0, 500, '…');
    }
}
