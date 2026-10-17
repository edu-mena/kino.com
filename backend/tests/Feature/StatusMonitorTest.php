<?php

use App\Mail\StatusAlertMail;
use App\Mail\StatusIncidentMail;
use App\Models\Restaurant;
use App\Models\StatusIncident;
use App\Models\StatusSubscriber;
use App\Models\User;
use App\Services\PushNotificationService;
use App\Services\Status\HealthChecks;
use App\Services\Status\StatusMonitor;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Mail;

/*
 * Ciclo de um incidente: alerta ao operador → aviso aos utilizadores →
 * resolução ("Depois dos anjos…"). Ver StatusMonitor.
 */

/** Verificações falsas, controladas pelo teste. */
function fakeChecks(array $failing = [], string $error = 'RedisException: Connection refused'): void
{
    $results = [];
    foreach (['database', 'cache', 'queue', 'web', 'api'] as $name) {
        $ok = ! in_array($name, $failing, true);
        $results[$name] = ['ok' => $ok, 'error' => $ok ? null : $error, 'ms' => 3];
    }
    $checks = Mockery::mock(HealthChecks::class);
    $checks->shouldReceive('run')->andReturn($results);
    app()->instance(HealthChecks::class, $checks);
}

function tickAt(string $time): void
{
    app(StatusMonitor::class)->tick(CarbonImmutable::parse($time));
}

beforeEach(function () {
    Mail::fake();
    config([
        'status.alert_email' => 'ops@luku.test',
        'status.fallback_state_path' => storage_path('framework/testing/status-monitor.json'),
    ]);
    @unlink(config('status.fallback_state_path'));

    $this->pushes = [];
    $push = Mockery::mock(PushNotificationService::class);
    $push->shouldReceive('sendMessage')->andReturnUsing(function (User $user, string $title, string $body) {
        $this->pushes[] = compact('title', 'body') + ['user' => $user->id];
    });
    $push->shouldReceive('sendForNotification');
    app()->instance(PushNotificationService::class, $push);
});

test('tudo OK: só regista o minuto no histórico, sem incidente nem emails', function () {
    fakeChecks();
    tickAt('2026-10-17 10:00:00');

    expect(StatusIncident::count())->toBe(0);
    Mail::assertNothingSent();
    $this->assertDatabaseHas('status_daily', ['component' => 'orders', 'total_minutes' => 1, 'ok_minutes' => 1]);
});

test('ciclo completo: alerta técnico já, utilizadores ao fim de 3 min, resolução ao fim de 5 min estável', function () {
    $user = User::factory()->create();
    $user->deviceTokens()->create(['platform' => 'ios', 'token' => 'fcm-ios']);
    StatusSubscriber::create(['email' => 'fa@luku.test', 'confirmed_at' => now()]);
    StatusSubscriber::create(['email' => 'por-confirmar@luku.test']);

    // 1.º minuto em falha: só o operador, com o erro exato.
    fakeChecks(['queue']);
    tickAt('2026-10-17 17:18:00');
    $incident = StatusIncident::sole();
    expect($incident->components)->toBe(['notifications'])
        ->and($incident->internal_error)->toContain('Connection refused');
    Mail::assertSent(StatusAlertMail::class, fn ($m) => $m->phase === 'started' && $m->hasTo('ops@luku.test'));
    expect($this->pushes)->toBe([]);

    // Ainda dentro dos 3 minutos: nada aos utilizadores.
    tickAt('2026-10-17 17:20:00');
    expect($this->pushes)->toBe([]);

    // 3 minutos: "Ups, aconteceu um erro…" por push e email (só inscritos confirmados).
    tickAt('2026-10-17 17:21:00');
    expect($this->pushes)->toHaveCount(1)
        ->and($this->pushes[0]['title'])->toContain('Ups, aconteceu um erro')
        ->and($this->pushes[0]['body'])->toContain('A equipa técnica já está a trabalhar na solução');
    Mail::assertSent(StatusIncidentMail::class, fn ($m) => $m->hasTo('fa@luku.test'));
    Mail::assertNotSent(StatusIncidentMail::class, fn ($m) => $m->hasTo('por-confirmar@luku.test'));

    // Recupera às 17:30; a recaída às 17:32 recomeça a contagem.
    fakeChecks();
    tickAt('2026-10-17 17:30:00');
    fakeChecks(['queue']);
    tickAt('2026-10-17 17:32:00');
    expect($incident->fresh()->recovering_since)->toBeNull();

    fakeChecks();
    tickAt('2026-10-17 17:33:00');
    tickAt('2026-10-17 17:37:00');
    expect($incident->fresh()->resolved_at)->toBeNull();
    tickAt('2026-10-17 17:38:00');

    $incident->refresh();
    expect($incident->resolved_at->toDateTimeString())->toBe('2026-10-17 17:33:00');
    Mail::assertSent(StatusAlertMail::class, fn ($m) => $m->phase === 'resolved');

    // Hora de Luanda (UTC+1) e a causa por omissão na mensagem.
    $last = end($this->pushes);
    expect($last['title'])->toBe('Depois dos anjos estão os engenheiros! 😄')
        ->and($last['body'])->toContain('das 18:18 às 18:33')
        ->and($last['body'])->toContain('uma pequena falha num dos nossos serviços');
});

test('falha curta (menos de 3 min) nunca chega aos utilizadores', function () {
    User::factory()->create()->deviceTokens()->create(['platform' => 'web', 'token' => '{}']);

    fakeChecks(['cache']);
    tickAt('2026-10-17 10:00:00');
    fakeChecks();
    tickAt('2026-10-17 10:01:00');
    tickAt('2026-10-17 10:07:00');

    expect(StatusIncident::sole()->resolved_at)->not->toBeNull()
        ->and($this->pushes)->toBe([]);
    Mail::assertNotSent(StatusIncidentMail::class);
    Mail::assertSent(StatusAlertMail::class, 2); // início + resolução, só ao operador
});

test('quem tem um pedido em curso recebe o aviso por email mesmo sem estar inscrito', function () {
    $restaurant = Restaurant::factory()->create();
    $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'Ana', 'customer_phone' => '900',
        'customer_email' => 'ana@luku.test', 'pickup_asap' => true, 'status' => 'accepted', 'subtotal' => 1000, 'total' => 1000,
    ]);

    fakeChecks(['database', 'api'], 'erro');
    // Base de dados em baixo: nada gravado, só o ficheiro local + alerta.
    tickAt('2026-10-17 10:00:00');
    expect(StatusIncident::count())->toBe(0)
        ->and(is_file(config('status.fallback_state_path')))->toBeTrue();
    Mail::assertSent(StatusAlertMail::class, 1);

    // Volta a base de dados, mas a API continua em falha: o incidente passa
    // para a base de dados com o início original e os utilizadores são avisados.
    fakeChecks(['api'], 'HTTP 502');
    tickAt('2026-10-17 10:04:00');

    $incident = StatusIncident::sole();
    expect($incident->started_at->toDateTimeString())->toBe('2026-10-17 10:00:00')
        ->and($incident->users_notified_at)->not->toBeNull();
    Mail::assertSent(StatusAlertMail::class, 1); // sem alerta repetido
    Mail::assertSent(StatusIncidentMail::class, fn ($m) => $m->hasTo('ana@luku.test'));
});

test('a causa escrita pelo operador entra na mensagem de resolução', function () {
    $incident = StatusIncident::create([
        'components' => ['orders'], 'started_at' => '2026-10-17 09:00:00', 'last_failure_at' => '2026-10-17 09:10:00',
        'recovering_since' => '2026-10-17 09:10:00', 'users_notified_at' => '2026-10-17 09:03:00',
        'public_cause' => 'uma atualização do servidor de pagamentos',
    ]);
    User::factory()->create()->deviceTokens()->create(['platform' => 'android', 'token' => 'x']);

    fakeChecks();
    tickAt('2026-10-17 09:16:00');

    expect($incident->fresh()->resolved_at)->not->toBeNull()
        ->and(end($this->pushes)['body'])->toContain('devido a uma atualização do servidor de pagamentos');
});
