<?php

use App\Models\User;

test('push:check aponta o que falta e avisa sem dispositivos registados', function () {
    config([
        'services.vapid.public_key' => 'pub',
        'services.vapid.private_key' => 'priv',
        'firebase.projects.app.credentials' => null,
        'firebase.default' => 'app',
    ]);
    $user = User::factory()->create(['email' => 'cliente@luku.test']);

    $this->artisan('push:check', ['email' => $user->email])
        ->expectsOutputToContain('Web Push (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY): OK')
        ->expectsOutputToContain('FALTA')
        ->expectsOutputToContain('nenhum (ninguém ativou o push ainda)')
        ->expectsOutputToContain('não tem nenhum dispositivo registado')
        ->assertSuccessful();
});
