<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    | Disco dos documentos privados (comprovativos/faturas) — `r2-private` em
    | produção; `local` (storage/app/private, URLs assinados servidos pelo
    | próprio Laravel) serve para dev sem bucket privado configurado.
    */
    'documents_disk' => env('DOCUMENTS_DISK', 'r2-private'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

        // Cloudflare R2 — mesmo driver S3 (Flysystem), só muda o endpoint.
        // Disco usado por todo o pipeline de upload (ver App\Services\MediaUploadService).
        // AWS_ENDPOINT deve ser o endpoint R2 da conta
        // (https://<account_id>.r2.cloudflarestorage.com); R2_PUBLIC_URL é o
        // domínio customizado Cloudflare em frente ao bucket (CDN, cacheado
        // na edge) usado para gerar as URLs públicas devolvidas pela API —
        // nunca a URL direta do endpoint R2 (não é pública por padrão).
        'r2' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'auto'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('R2_PUBLIC_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', true),
            'throw' => true,
            'report' => false,
        ],

        // Bucket R2 PRIVADO (sem domínio público nem r2.dev) — comprovativos
        // de pagamento e faturas (NIF, dados bancários): auditoria de
        // segurança, Fase 2. Nunca servidos por URL permanente — só por
        // URL assinado de curta duração, gerado quando a API devolve o
        // pedido/reserva a quem já está autorizado a vê-lo (ver
        // MediaUploadService::documentUrl). Mesmas credenciais do `r2`
        // (o token R2 tem de ter acesso aos dois buckets).
        'r2-private' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'auto'),
            'bucket' => env('R2_PRIVATE_BUCKET'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', true),
            'throw' => true,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
