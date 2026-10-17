<?php

use App\Services\Status\HealthChecks;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

test('verificações: base de dados e cache OK, erro HTTP da API e site em baixo ficam isolados', function () {
    config(['status.web_url' => 'https://www.luku.test', 'status.api_url' => 'https://api.luku.test/api/v1/restaurants']);
    Http::fake([
        'api.luku.test/*' => Http::response(['message' => 'Server Error'], 500),
        'www.luku.test*' => fn () => throw new ConnectionException('Connection timed out'),
    ]);

    $results = app(HealthChecks::class)->run();

    expect($results['database']['ok'])->toBeTrue()
        ->and($results['cache']['ok'])->toBeTrue()
        ->and($results['queue']['ok'])->toBeTrue() // fila `sync` nos testes
        ->and($results['web'])->toMatchArray(['ok' => false])
        ->and($results['web']['error'])->toContain('Connection timed out')
        ->and($results['api']['error'])->toContain('HTTP 500');
});

test('cache e fila com failover: Redis primeiro, base de dados como reserva', function () {
    expect(config('cache.stores.failover.stores'))->toBe(['redis', 'database'])
        ->and(config('queue.connections.failover.connections'))->toBe(['redis', 'database']);
});
