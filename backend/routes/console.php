<?php

use App\Jobs\ExpireStoriesJob;
use App\Jobs\SendRestaurantDailyDigestsJob;
use App\Models\BlockedIp;
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
