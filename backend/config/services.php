<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Login de cliente (ver App\Services\GoogleOAuthService) — só usado
    // para verificar id_token/trocar code, nunca para escrever no Google.
    // 3 client_ids distintos (um por plataforma, registados na Google Cloud
    // Console) porque o Google Sign-In nativo emite id_tokens com `aud` =
    // client_id da plataforma que gerou o login, não um único client_id
    // partilhado — ver GoogleOAuthService::verifyIdToken().
    'google' => [
        'web_client_id' => env('GOOGLE_WEB_CLIENT_ID'),
        'android_client_id' => env('GOOGLE_ANDROID_CLIENT_ID'),
        'ios_client_id' => env('GOOGLE_IOS_CLIENT_ID'),
        // Secret só existe/é usado no fluxo Web (authorization-code) —
        // Android/iOS nunca o veem (Google Sign-In nativo não usa secret).
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    ],

    // Web Push (ver App\Services\PushNotificationService) — só cobre browser
    // (Chrome/Edge/Firefox/Safari), não a app nativa Android/iOS (essa
    // precisaria de FCM/APNs, fora do escopo desta fase). Par de chaves
    // VAPID gerado com openssl (ver README ou "php artisan push:vapid" —
    // não há comando nenhum ainda, gera-se à mão como no README do
    // minishlink/web-push). A chave pública também é usada pelo frontend
    // (VITE_VAPID_PUBLIC_KEY) — não é secreta, viaja para o browser.
    'vapid' => [
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
        'subject' => env('VAPID_SUBJECT', 'mailto:suporte@luku.com'),
    ],

];
