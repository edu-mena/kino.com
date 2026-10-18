<?php

use App\Mail\StatusSubscriptionConfirmMail;
use App\Models\StatusIncident;
use App\Models\StatusSubscriber;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

test('GET /status: tudo operacional com 90 dias de histórico por serviço', function () {
    $this->getJson('/api/v1/status')
        ->assertOk()
        ->assertJsonPath('data.status', 'operational')
        ->assertJsonPath('data.activeIncident', null)
        ->assertJsonCount(5, 'data.components')
        ->assertJsonCount(90, 'data.components.0.days');
});

test('GET /status nunca expõe o erro técnico do incidente', function () {
    StatusIncident::create([
        'components' => ['orders'], 'internal_error' => 'RedisException: luku-api-redis.internal recusou',
        'started_at' => now()->subMinutes(10), 'last_failure_at' => now(), 'users_notified_at' => now()->subMinutes(7),
    ]);

    $response = $this->getJson('/api/v1/status')
        ->assertOk()
        ->assertJsonPath('data.status', 'incident')
        ->assertJsonPath('data.activeIncident.status', 'investigating')
        ->assertJsonPath('data.components.2.status', 'outage');

    expect($response->getContent())
        ->not->toContain('Redis')
        ->not->toContain('internal')
        ->toContain('Ups, aconteceu um erro');
});

test('incidente que o operador ainda não autorizou comunicar não aparece ao público', function () {
    StatusIncident::create([
        'components' => ['menus'], 'started_at' => now()->subMinutes(30), 'last_failure_at' => now(),
    ]);

    $this->getJson('/api/v1/status')->assertOk()->assertJsonPath('data.activeIncident', null);
});

test('inscrição nos avisos: dupla confirmação e cancelamento', function () {
    Mail::fake();

    $this->postJson('/api/v1/status/subscribe', ['email' => 'Joana@Luku.test'])->assertAccepted();
    $subscriber = StatusSubscriber::sole();
    expect($subscriber->email)->toBe('joana@luku.test')->and($subscriber->confirmed_at)->toBeNull();
    Mail::assertQueued(StatusSubscriptionConfirmMail::class, fn ($m) => $m->hasTo('joana@luku.test'));

    $this->postJson('/api/v1/status/confirm', ['token' => 'errado'])->assertNotFound();
    $this->postJson('/api/v1/status/confirm', ['token' => $subscriber->token])->assertOk();
    expect($subscriber->fresh()->confirmed_at)->not->toBeNull();

    // Repetir a inscrição não revela nada nem reenvia a confirmação.
    $this->postJson('/api/v1/status/subscribe', ['email' => 'joana@luku.test'])->assertAccepted();
    Mail::assertQueued(StatusSubscriptionConfirmMail::class, 1);

    $this->postJson('/api/v1/status/unsubscribe', ['token' => $subscriber->token])->assertOk();
    expect(StatusSubscriber::count())->toBe(0);
});

test('painel de sistema: só operadores veem o erro técnico e editam a causa', function () {
    $incident = StatusIncident::create([
        'components' => ['orders'], 'internal_error' => 'QueryException: too many connections',
        'started_at' => now()->subMinutes(10), 'last_failure_at' => now(),
    ]);

    $this->actingAs(User::factory()->create())->getJson('/api/v1/system/status')->assertForbidden();

    $operator = User::factory()->create(['role' => 'system_operator']);
    $this->actingAs($operator)->getJson('/api/v1/system/status')
        ->assertOk()
        ->assertJsonPath('data.incidents.0.internalError', 'QueryException: too many connections');

    $this->actingAs($operator)
        ->patchJson("/api/v1/system/status/incidents/{$incident->uuid}", ['public_cause' => 'um pico de acessos'])
        ->assertOk();
    expect($incident->fresh()->public_cause)->toBe('um pico de acessos');

    $this->actingAs($operator)->postJson("/api/v1/system/status/incidents/{$incident->uuid}/resolve")
        ->assertOk()
        ->assertJsonPath('data.status', 'resolved')
        ->assertJsonPath('data.cause', 'um pico de acessos');
    expect($incident->fresh()->resolution_notified_at)->toBeNull(); // nunca sozinho
});
