<?php

namespace App\Services\MenusAo;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Pedidos ao menus.ao com cortesia: um pedido de cada vez, pausa entre
 * pedidos e identificação clara. O site é lento (respostas de 20–40 s não
 * são raras), daí o timeout longo e as tentativas.
 *
 * `cacheDir` (só para desenvolvimento): guarda o HTML em disco para não
 * voltar a pedir as mesmas páginas enquanto se afina o parser.
 */
class MenusAoClient
{
    private const USER_AGENT = 'LukuImporter/1.0 (+https://luku.ao)';

    private float $lastRequestAt = 0;

    public function __construct(
        private readonly int $delayMs = 800,
        private readonly ?string $cacheDir = null,
    ) {}

    public function page(string $path): string
    {
        $url = MenusAoParser::BASE_URL.'/'.ltrim($path, '/');
        $cacheFile = $this->cacheDir ? rtrim($this->cacheDir, '/\\').'/'.sha1($url).'.html' : null;
        if ($cacheFile && is_file($cacheFile)) {
            return (string) file_get_contents($cacheFile);
        }

        $this->pause();
        $response = Http::withHeaders(['User-Agent' => self::USER_AGENT, 'Accept-Language' => 'pt'])
            ->timeout(90)
            ->retry(3, $this->retrySleep(3000), throw: false)
            ->get($url);

        if (! $response->successful()) {
            throw new RuntimeException("menus.ao respondeu {$response->status()} a {$url}");
        }
        $html = $response->body();
        if ($cacheFile) {
            @mkdir(dirname($cacheFile), 0775, true);
            file_put_contents($cacheFile, $html);
        }

        return $html;
    }

    /** Bytes de uma imagem; `null` se falhar ou não for imagem. */
    public function image(string $url, int $maxBytes = 8 * 1024 * 1024): ?string
    {
        $this->pause(250);
        $response = Http::withHeaders(['User-Agent' => self::USER_AGENT])
            ->timeout(60)
            ->retry(2, $this->retrySleep(2000), throw: false)
            ->get($url);
        if (! $response->successful()) {
            return null;
        }
        $bytes = $response->body();
        if ($bytes === '' || strlen($bytes) > $maxBytes || @getimagesizefromstring($bytes) === false) {
            return null;
        }

        return $bytes;
    }

    private function retrySleep(int $ms): int
    {
        return app()->runningUnitTests() ? 0 : $ms;
    }

    private function pause(?int $ms = null): void
    {
        $wait = ($ms ?? $this->delayMs) / 1000 - (microtime(true) - $this->lastRequestAt);
        if ($wait > 0 && ! app()->runningUnitTests()) {
            usleep((int) ($wait * 1_000_000));
        }
        $this->lastRequestAt = microtime(true);
    }
}
