<?php

use App\Services\MediaUploadService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('r2', ['url' => 'https://cdn.luku.com']);
    config(['filesystems.disks.r2.url' => 'https://cdn.luku.com']);
});

/** Largura/altura e tipo de um ficheiro do disco fake. */
function imageInfo(string $path): array
{
    $info = getimagesizefromstring(Storage::disk('r2')->get($path));

    return [$info[0], $info[1], $info['mime']];
}

function jpegBytes(int $width, int $height): string
{
    // Numa variável: o ficheiro temporário do fake desaparece assim que o
    // objeto é libertado.
    $file = UploadedFile::fake()->image('x.jpg', $width, $height);

    return (string) file_get_contents($file->getRealPath());
}

test('o nome da miniatura troca a extensão por .w<largura>.webp', function () {
    expect(MediaUploadService::thumbnailPath('dish/user-1/abc.jpg', 480))->toBe('dish/user-1/abc.w480.webp')
        ->and(MediaUploadService::isThumbnailPath('dish/user-1/abc.w480.webp'))->toBeTrue()
        ->and(MediaUploadService::isThumbnailPath('dish/user-1/abc.jpg'))->toBeFalse();
});

test('upload de imagem grava o original e as três miniaturas WebP', function () {
    $file = UploadedFile::fake()->image('prato.jpg', 1600, 900);

    $url = app(MediaUploadService::class)->storeImage($file, 'cover', 'user-1');
    $path = str_replace('https://cdn.luku.com/', '', $url);

    Storage::disk('r2')->assertExists($path);
    expect(imageInfo(MediaUploadService::thumbnailPath($path, 160)))->toBe([160, 90, 'image/webp'])
        ->and(imageInfo(MediaUploadService::thumbnailPath($path, 480)))->toBe([480, 270, 'image/webp'])
        ->and(imageInfo(MediaUploadService::thumbnailPath($path, 960)))->toBe([960, 540, 'image/webp']);
});

test('original mais estreito do que a miniatura: fica com a largura dele, nunca amplia', function () {
    $file = UploadedFile::fake()->image('prato.jpg', 800, 800);

    $url = app(MediaUploadService::class)->storeImage($file, 'dish', 'user-1');
    $path = str_replace('https://cdn.luku.com/', '', $url);

    expect(imageInfo(MediaUploadService::thumbnailPath($path, 960)))->toBe([800, 800, 'image/webp'])
        ->and(imageInfo(MediaUploadService::thumbnailPath($path, 480)))->toBe([480, 480, 'image/webp']);
});

test('ficheiro que o GD não lê não gera miniaturas nem rebenta', function () {
    $ok = app(MediaUploadService::class)->storeThumbnails('dish/user-1/x.jpg', 'isto não é uma imagem');

    expect($ok)->toBeFalse()
        ->and(Storage::disk('r2')->allFiles())->toBe([]);
});

test('apagar a imagem apaga também as miniaturas', function () {
    $uploads = app(MediaUploadService::class);
    $url = $uploads->storeImage(UploadedFile::fake()->image('prato.jpg', 600, 600), 'dish', 'user-1');
    expect(Storage::disk('r2')->allFiles())->toHaveCount(4);

    $uploads->deleteByUrl($url);

    expect(Storage::disk('r2')->allFiles())->toBe([]);
});

test('media:thumbnails gera as que faltam, ignora vídeos e miniaturas, e pode repetir-se', function () {
    $disk = Storage::disk('r2');
    $disk->put('dish/user-1/antigo.jpg', jpegBytes(900, 900));
    $disk->put('promo/7/video.mp4', 'video');

    $this->artisan('media:thumbnails --dry-run')
        ->expectsOutputToContain('Por gerar: 1')
        ->assertSuccessful();
    $disk->assertMissing('dish/user-1/antigo.w960.webp');

    $this->artisan('media:thumbnails')
        ->expectsOutputToContain('Geradas: 1')
        ->assertSuccessful();
    foreach (MediaUploadService::THUMBNAIL_WIDTHS as $width) {
        $disk->assertExists("dish/user-1/antigo.w{$width}.webp");
    }
    $disk->assertMissing('promo/7/video.w160.webp');

    $this->artisan('media:thumbnails')
        ->expectsOutputToContain('Geradas: 0 — já tinham: 1')
        ->assertSuccessful();
});
