<?php

use App\Jobs\ExpireStoriesJob;
use App\Jobs\SendRestaurantDailyDigestsJob;
use App\Models\BlockedIp;
use App\Models\DeviceToken;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Reservation;
use App\Models\User;
use App\Services\AccountDeletionService;
use App\Services\MediaUploadService;
use App\Services\PushNotificationService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Storage;
use Kreait\Firebase\Contract\Messaging as FirebaseMessaging;
use Minishlink\WebPush\WebPush;

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
    // Caminho para o ficheiro (dev) OU o próprio JSON na variável (produção,
    // ex.: `fly secrets set FIREBASE_CREDENTIALS="$(cat chave.json)"`) — o
    // pacote kreait aceita os dois.
    $firebaseFile = $firebasePath !== '' && (str_starts_with(ltrim($firebasePath), '{')
        || is_file($firebasePath) || is_file(base_path($firebasePath)));
    $queue = (string) config('queue.default');

    $this->line('Web Push (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY): '.$ok((bool) $vapid));
    $this->line('Android (FIREBASE_CREDENTIALS: ficheiro ou JSON da conta de serviço): '.$ok($firebaseFile)
        .($firebasePath !== '' && ! $firebaseFile ? " (caminho definido mas o ficheiro não existe: {$firebasePath})" : ''));
    // Configuração presente não chega: criar o cliente pode falhar em runtime
    // (ex.: a biblioteca Web Push exige a extensão GMP ou BCMath — sem ela o
    // envio desistia EM SILÊNCIO e isto dizia "OK"; caso real em produção).
    if ($vapid) {
        try {
            new WebPush(['VAPID' => [
                'subject' => config('services.vapid.subject'),
                'publicKey' => config('services.vapid.public_key'),
                'privateKey' => config('services.vapid.private_key'),
            ]]);
            $this->line('Web Push — cliente de envio: <info>OK</info>');
        } catch (Throwable $e) {
            $this->line('Web Push — cliente de envio: <error>FALHA</error> '.$e->getMessage());
        }
    }
    if ($firebaseFile) {
        try {
            app(FirebaseMessaging::class);
            $this->line('Android — cliente FCM: <info>OK</info>');
        } catch (Throwable $e) {
            $this->line('Android — cliente FCM: <error>FALHA</error> '.$e->getMessage());
        }
    }

    $this->line("Fila: {$queue}".($queue === 'sync'
        ? ' (envio imediato, sem worker)'
        : ' — o push só sai com um worker a correr (Horizon no docker compose, ou php artisan queue:work)'));

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

/*
 * Auditoria de segurança, Fase 2 — move os comprovativos/faturas enviados
 * ANTES do bucket privado (URL público permanente na CDN) para o disco de
 * documentos privado, e apaga a cópia pública. Idempotente: só toca em
 * valores que ainda são URLs da CDN. Escreve direto na tabela (não via
 * model) para os Observers não dispararem notificações de "novo
 * comprovativo" a clientes/restaurantes.
 */
Artisan::command('documents:privatize {--dry-run : Só lista o que seria movido}', function () {
    $publicBase = rtrim((string) config('filesystems.disks.r2.url'), '/').'/';
    $public = Storage::disk('r2');
    $private = app(MediaUploadService::class)->documentsDisk();
    $dryRun = (bool) $this->option('dry-run');
    $moved = $missing = 0;

    foreach (['orders', 'reservations'] as $table) {
        foreach (['payment_proof_url', 'invoice_url'] as $column) {
            DB::table($table)->where($column, 'like', $publicBase.'%')->orderBy('id')
                ->each(function ($row) use ($table, $column, $publicBase, $public, $private, $dryRun, &$moved, &$missing) {
                    $path = substr($row->{$column}, strlen($publicBase));

                    if (! $public->exists($path)) {
                        $missing++;
                        $this->warn("{$table}#{$row->id} {$column}: ficheiro já não existe no bucket público ({$path}) — ignorado.");

                        return;
                    }

                    $this->line("{$table}#{$row->id} {$column}: {$path}");
                    if ($dryRun) {
                        $moved++;

                        return;
                    }

                    $private->put($path, $public->get($path));
                    DB::table($table)->where('id', $row->id)->update([$column => $path]);
                    $public->delete($path);
                    $moved++;
                });
        }
    }

    $verb = $dryRun ? 'a mover' : 'movidos';
    $this->info("{$moved} documento(s) {$verb} para o disco privado; {$missing} em falta.");
})->purpose('Mover comprovativos/faturas antigos do bucket público para o privado');

// Retenção de dados (auditoria de segurança, Fase 3) — prazos em cada model
// (`prunable()`: notificações, visitas ao perfil, idempotência, auditoria de
// sistema, mensagens de contacto, candidaturas recusadas).
Schedule::command('model:prune')->dailyAt('03:30')->onOneServer();

/*
 * Anonimiza pedidos/reservas de CONVIDADOS já terminados há mais de
 * `privacy.guest_retention_days` — desligado enquanto esse prazo não estiver
 * definido (ver config/privacy.php). Query builder: sem Observers/notificações.
 */
Artisan::command('privacy:anonymize-guests {--dry-run : Só conta o que seria anonimizado}', function () {
    $days = config('privacy.guest_retention_days');
    if (! $days) {
        $this->info('Desligado (PRIVACY_GUEST_RETENTION_DAYS não definido).');

        return;
    }

    $before = now()->subDays((int) $days);
    $name = AccountDeletionService::ANONYMOUS_NAME;

    $orders = Order::query()->whereNull('user_id')->where('customer_name', '!=', $name)
        ->whereIn('status', ['delivered', 'completed', 'rejected', 'canceled'])
        ->where('updated_at', '<', $before);
    // Terminada = recusada/cancelada/anulada, ou confirmada com a data já
    // passada — o OR fica agrupado, para o prazo valer para ambos os ramos.
    $reservations = Reservation::query()->whereNull('user_id')->where('customer_name', '!=', $name)
        ->where('updated_at', '<', $before)
        ->where(fn ($q) => $q->whereIn('status', ['declined', 'canceled', 'voided'])
            ->orWhere(fn ($q) => $q->where('status', 'confirmed')->where('date', '<', $before->toDateString())));

    if ($this->option('dry-run')) {
        $this->info("{$orders->count()} pedido(s) e {$reservations->count()} reserva(s) seriam anonimizados.");

        return;
    }

    $o = $orders->update([
        'customer_name' => $name, 'customer_phone' => '', 'customer_email' => null,
        'delivery_address_snapshot' => null, 'note' => null,
    ]);
    $r = $reservations->update([
        'customer_name' => $name, 'customer_phone' => '', 'customer_email' => null, 'special_requests' => null,
    ]);
    $this->info("{$o} pedido(s) e {$r} reserva(s) de convidados anonimizados.");
})->purpose('Anonimizar dados de convidados em pedidos/reservas antigos (retenção)');

Schedule::command('privacy:anonymize-guests')->dailyAt('03:45')->onOneServer();
