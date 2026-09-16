<?php

// Sem este ficheiro, o Laravel usa o default do vendor (allowed_origins
// '*') — aceitável em dev (facilita testar de qualquer origem/IP da LAN,
// ver histórico de testes em rede local), mas em produção queremos poder
// restringir às origens reais (frontend em luku.ao + a webview nativa das
// apps Android/iOS, que corre em `https://localhost`/`capacitor://localhost`
// — ver capacitor.config.ts `androidScheme: "https"`). Explícito em vez de
// confiar no default do pacote: config de segurança não deve ser implícita.
return [

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    // CORS_ALLOWED_ORIGINS="https://luku.ao,https://www.luku.ao,capacitor://localhost,https://localhost"
    // em produção (ver .env.production.example). Sem a variável definida,
    // mantém-se '*' — mesmo comportamento de sempre em dev/LAN testing.
    'allowed_origins' => array_filter(array_map(
        trim(...),
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', '*'))
    )),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Nunca true: a API usa Bearer tokens (Sanctum), não cookies — não há
    // sessão cross-site a proteger/expor aqui.
    'supports_credentials' => false,

];
