<?php

/*
|--------------------------------------------------------------------------
| Página de estado e avisos de incidente
|--------------------------------------------------------------------------
| Ver App\Services\Status\StatusMonitor. Os nomes públicos dos serviços são
| propositadamente genéricos ("Pedidos e reservas", nunca "Redis" ou
| "Postgres") — a página mostra o que o cliente sente, não a arquitetura.
*/

return [

    // Serviço público => verificações internas de que depende.
    'components' => [
        'app' => ['checks' => ['web']],
        'menus' => ['checks' => ['api', 'database']],
        'orders' => ['checks' => ['database', 'cache']],
        'accounts' => ['checks' => ['database', 'cache']],
        'notifications' => ['checks' => ['queue']],
    ],

    // URLs verificadas por HTTP a partir do próprio servidor (o mesmo
    // caminho que um cliente faz, incluindo a proxy do Fly/Hostinger).
    'web_url' => env('STATUS_WEB_URL', env('FRONTEND_URL', 'https://luku.ao')),
    'api_url' => env('STATUS_API_URL', rtrim((string) env('APP_URL', 'https://api.luku.ao'), '/').'/api/v1/restaurants?per_page=1'),
    'http_timeout' => (int) env('STATUS_HTTP_TIMEOUT', 8),

    // Minutos de falha contínua antes de avisar os utilizadores (o operador
    // é avisado logo no primeiro minuto) e minutos estáveis antes de dar o
    // incidente por resolvido.
    'notify_users_after_minutes' => (int) env('STATUS_NOTIFY_AFTER', 3),
    'resolve_after_minutes' => (int) env('STATUS_RESOLVE_AFTER', 5),

    // Quem recebe o alerta técnico (com o erro exato).
    'alert_email' => env('STATUS_ALERT_EMAIL') ?: env('SECURITY_ALERT_EMAIL'),

    // Ficheiro local com o estado do incidente quando a base de dados está
    // em baixo (não dá para gravar o incidente lá) — ver StatusMonitor.
    'fallback_state_path' => storage_path('app/status-monitor.json'),

    // Causa mostrada na mensagem de resolução quando o operador não
    // escreveu nenhuma.
    'default_public_cause' => 'uma pequena falha num dos nossos serviços',
];
