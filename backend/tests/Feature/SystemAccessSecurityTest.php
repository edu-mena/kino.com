<?php

use App\Mail\SystemSecurityAlertMail;
use App\Models\BlockedIp;
use App\Models\SystemSecurityEvent;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

test('operador autentica com sucesso via /auth/system/login e recebe alerta por email', function () {
    Mail::fake();
    User::factory()->systemOperator()->create(['email' => 'operador@luku.ao']);

    $response = $this->postJson('/api/v1/auth/system/login', [
        'email' => 'operador@luku.ao',
        'password' => 'password',
    ]);

    $response->assertOk()->assertJsonPath('data.user.role', 'system_operator');
    expect(SystemSecurityEvent::query()->where('event', 'login_attempt')->where('outcome', 'success')->count())
        ->toBe(1);
    Mail::assertQueued(SystemSecurityAlertMail::class);
});

test('tentativa falhada de login de sistema é registada e alertada, com mensagem genérica', function () {
    Mail::fake();
    User::factory()->systemOperator()->create(['email' => 'operador@luku.ao']);

    $response = $this->postJson('/api/v1/auth/system/login', [
        'email' => 'operador@luku.ao',
        'password' => 'errada',
    ]);

    $response->assertStatus(401)->assertJson(['message' => 'Credenciais inválidas.']);
    expect(SystemSecurityEvent::query()->where('event', 'login_attempt')->where('outcome', 'failed')->count())
        ->toBe(1);
    Mail::assertQueued(SystemSecurityAlertMail::class);
});

test('restaurant_staff não consegue autenticar via /auth/system/login', function () {
    User::factory()->restaurantStaff()->create(['email' => 'staff@restaurante.com']);

    $this->postJson('/api/v1/auth/system/login', [
        'email' => 'staff@restaurante.com',
        'password' => 'password',
    ])->assertStatus(401);
});

test('system_operator deixou de conseguir entrar pelo /auth/login antigo', function () {
    // Isolamento de superfície: se as credenciais de um operador vazarem, o
    // atacante não pode contornar a auditoria/bloqueio de /auth/system/login
    // simplesmente usando o endpoint antigo de staff.
    User::factory()->systemOperator()->create(['email' => 'operador@luku.ao']);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'operador@luku.ao',
        'password' => 'password',
    ])->assertStatus(401);
});

test('5 falhas seguidas do mesmo IP bloqueiam esse IP automaticamente', function () {
    Mail::fake();
    User::factory()->systemOperator()->create(['email' => 'operador@luku.ao']);

    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/auth/system/login', [
            'email' => 'operador@luku.ao',
            'password' => 'errada',
        ])->assertStatus(401);
    }

    expect(BlockedIp::query()->where('reason', 'auto:too_many_failed_attempts')->exists())->toBeTrue();

    // A 6ª tentativa (mesmo com password CORRETA) nunca chega a autenticar
    // — 401 se o bloqueio de IP intercetou primeiro, 429 se foi o rate
    // limiter (`system-auth`, 5/min) a bater primeiro; qual dos dois
    // depende só da ordem de prioridade interna do Laravel entre
    // middleware, não é o que este teste quer fixar — o que importa é que
    // nenhum dos dois deixa passar.
    $response = $this->postJson('/api/v1/auth/system/login', [
        'email' => 'operador@luku.ao',
        'password' => 'password',
    ]);
    expect($response->status())->toBeIn([401, 429]);
    expect(SystemSecurityEvent::query()->where('event', 'login_attempt')->count())->toBe(5); // não 6
});

test('IP bloqueado manualmente é rejeitado com a mesma mensagem genérica', function () {
    BlockedIp::factory()->create(['ip' => '127.0.0.1']);
    User::factory()->systemOperator()->create(['email' => 'operador@luku.ao']);

    $this->postJson('/api/v1/auth/system/login', [
        'email' => 'operador@luku.ao',
        'password' => 'password',
    ])->assertStatus(401)->assertJson(['message' => 'Credenciais inválidas.']);
});

test('notify regista a visita à página e envia um único email por IP a cada 15 min', function () {
    Mail::fake();

    $this->postJson('/api/v1/system-access/notify')->assertNoContent();
    $this->postJson('/api/v1/system-access/notify')->assertNoContent();
    $this->postJson('/api/v1/system-access/notify')->assertNoContent();

    expect(SystemSecurityEvent::query()->where('event', 'page_view')->count())->toBe(3);
    Mail::assertQueued(SystemSecurityAlertMail::class, 1);
});

test('link assinado do email bloqueia o IP com um clique, sem sessão', function () {
    $url = URL::signedRoute('system-access.block-ip', ['ip' => '203.0.113.9']);

    $this->get($url)->assertOk();

    expect(BlockedIp::query()->where('ip', '203.0.113.9')->where('reason', 'manual:email_link')->exists())
        ->toBeTrue();
});

test('link de bloqueio sem assinatura válida é rejeitado', function () {
    $this->get('/api/v1/system-access/block-ip/203.0.113.9')->assertForbidden();
    expect(BlockedIp::query()->where('ip', '203.0.113.9')->exists())->toBeFalse();
});

test('o mailable de alerta renderiza sem erro (page_view, sucesso, falha e auto-bloqueio)', function (
    string $event,
    ?string $outcome,
    bool $autoBlocked,
) {
    // Mail::fake() nos outros testes nunca renderiza de facto o blade —
    // isto apanha um erro de sintaxe/variável em falta que só apareceria
    // ao enviar um email a sério em produção.
    $record = SystemSecurityEvent::factory()->create([
        'event' => $event,
        'outcome' => $outcome,
        'email_attempted' => $event === 'login_attempt' ? 'operador@luku.ao' : null,
    ]);

    $html = (new SystemSecurityAlertMail($record, recentFailedAttempts: 3, autoBlocked: $autoBlocked))->render();

    expect($html)->toContain($record->ip);
})->with([
    ['page_view', null, false],
    ['login_attempt', 'success', false],
    ['login_attempt', 'failed', false],
    ['login_attempt', 'failed', true],
]);

test('só system_operator autenticado gere a lista de IPs bloqueados', function () {
    $blocked = BlockedIp::factory()->create();
    $staff = User::factory()->restaurantStaff()->create();
    $operator = User::factory()->systemOperator()->create();

    $this->actingAs($staff, 'sanctum')->getJson('/api/v1/system-access/blocked-ips')->assertForbidden();

    $this->actingAs($operator, 'sanctum')
        ->getJson('/api/v1/system-access/blocked-ips')
        ->assertOk()->assertJsonCount(1, 'data');

    $this->actingAs($operator, 'sanctum')
        ->deleteJson("/api/v1/system-access/blocked-ips/{$blocked->id}")
        ->assertStatus(204);
    expect(BlockedIp::query()->find($blocked->id))->toBeNull();
});
