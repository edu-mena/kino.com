<?php

use App\Jobs\ExpireStoriesJob;
use App\Jobs\SendRestaurantDailyDigestsJob;
use App\Models\BlockedIp;
use App\Models\DeviceToken;
use App\Models\Notification;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Desbloqueio de emergência (ver EnsureIpNotBlocked/BlockedIp) — corre via
// `fly ssh console`/`docker exec`, sem precisar de nenhum login. Existe
// porque o próprio bloqueio (manual ou automático) pode acertar num IP
// legítimo por engano (rede partilhada, operador esqueceu a senha e
// bateu no limite) — sem isto, a única saída seria mexer na BD à mão.
Artisan::command('system-access:unblock {ip}', function (string $ip) {
    $deleted = BlockedIp::query()->where('ip', $ip)->delete();
    Cache::forget("blocked-ip:{$ip}");

    $this->info($deleted ? "IP {$ip} desbloqueado." : "IP {$ip} não estava bloqueado.");
})->purpose('Desbloquear um IP do login de sistema');

Artisan::command('system-access:list-blocked', function () {
    $rows = BlockedIp::query()->latest('blocked_at')->get(['ip', 'reason', 'blocked_at']);
    if ($rows->isEmpty()) {
        $this->info('Nenhum IP bloqueado.');

        return;
    }
    $this->table(['IP', 'Motivo', 'Bloqueado em'], $rows->map->only(['ip', 'reason', 'blocked_at']));
})->purpose('Listar IPs bloqueados do login de sistema');

// Ver docker-compose.yml (serviço "scheduler") — corre `schedule:run` a cada
// minuto; este job em si só faz trabalho de facto a cada 15min.
Schedule::job(new ExpireStoriesJob)->everyFifteenMinutes()->onOneServer();

// Resumo diário por email aos restaurantes (Fase N6) — 08:00, fuso de
// APP_TIMEZONE (já configurado). Só um por servidor (`onOneServer`), mesmo
// espírito do job acima — nunca dois resumos duplicados se mais que uma
// máquina do processo `scheduler` chegasse a correr ao mesmo tempo.
Schedule::job(new SendRestaurantDailyDigestsJob)->dailyAt('08:00')->onOneServer();

// Testar manualmente sem esperar pelas 08:00 — ver plano, Fase N6,
// "Verificação". Despacha o MESMO job da agenda, só que já (não enfileirado
// por trás de `queue:work`, mas o job em si continua ShouldQueue — corre
// síncrono aqui só porque `dispatchSync` ignora isso de propósito).
Artisan::command('digest:send', function () {
    SendRestaurantDailyDigestsJob::dispatchSync();
    $this->info('Resumo diário despachado (ver fila para os emails enviados).');
})->purpose('Enviar já o resumo diário de ontem aos restaurantes com atividade');

// Diagnóstico do push (item 14.2) — o envio é um no-op SILENCIOSO quando
// falta configuração (ver PushNotificationService), por isso "não chega
// nada" não diz porquê. Isto diz: chaves VAPID, credenciais Firebase, fila
// e dispositivos registados; com um email, envia já um push de teste a essa
// conta (síncrono, sem depender do worker da fila).
Artisan::command('push:check {email? : Conta a quem enviar um push de teste}', function (?string $email = null) {
    $ok = fn (bool $v) => $v ? '<info>OK</info>' : '<error>FALTA</error>';

    $vapid = config('services.vapid.public_key') && config('services.vapid.private_key');
    $firebasePath = (string) config('firebase.projects.'.config('firebase.default').'.credentials');
    $firebaseFile = $firebasePath !== '' && (is_file($firebasePath) || is_file(base_path($firebasePath)));
    $queue = (string) config('queue.default');

    $this->line('Web Push (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY): '.$ok((bool) $vapid));
    $this->line('Android (FIREBASE_CREDENTIALS → ficheiro JSON da conta de serviço): '.$ok($firebaseFile)
        .($firebasePath !== '' && ! $firebaseFile ? " (caminho definido mas o ficheiro não existe: {$firebasePath})" : ''));
    $this->line("Fila: {$queue}".($queue === 'sync'
        ? ' (envio imediato, sem worker)'
        : ' — o push só sai com um worker a correr: php artisan queue:work'));

    try {
        $counts = DeviceToken::query()->selectRaw('platform, count(*) as total')->groupBy('platform')->pluck('total', 'platform');
    } catch (Throwable $e) {
        $this->error('Não foi possível ler a base de dados (migrações por correr?): '.$e->getMessage());

        return;
    }
    $this->line('Dispositivos registados: '.($counts->isEmpty()
        ? 'nenhum (ninguém ativou o push ainda)'
        : $counts->map(fn ($n, $p) => "{$p}={$n}")->implode(', ')));

    if ($email === null) {
        return;
    }

    $user = User::query()->where('email', $email)->first();
    if (! $user) {
        $this->error("Não existe conta com o email {$email}.");

        return;
    }
    $platforms = $user->deviceTokens()->pluck('platform');
    if ($platforms->isEmpty()) {
        $this->warn("{$email} não tem nenhum dispositivo registado — ative o push na app (Perfil ou Painel → Notificações).");

        return;
    }

    $test = new Notification([
        'kind' => 'order',
        'event' => 'orderStatus',
        'user_id' => $user->id,
    ]);
    app(PushNotificationService::class)->sendForNotification($user, $test);
    $this->info("Push de teste enviado para {$email} ({$platforms->implode(', ')}). Se não chegar, ver storage/logs/laravel.log (linhas 'fcm:'/'web-push:').");
})->purpose('Verificar a configuração do push e enviar um push de teste');
