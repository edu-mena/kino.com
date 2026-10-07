<?php

use App\Jobs\ProcessUploadedVideoJob;
use App\Models\Restaurant;
use App\Models\SiteSetting;
use App\Models\User;
use App\Services\VideoTranscoder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    Storage::fake('r2', ['url' => 'https://cdn.luku.com']);
    config(['filesystems.disks.r2.url' => 'https://cdn.luku.com']);
});

test('operador guarda textos e imagens das páginas para visitantes, e ficam públicos', function () {
    $operator = User::factory()->systemOperator()->create();

    $saved = $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/site/settings', [
            // Multipart manda isto como JSON em texto.
            'guest_content' => json_encode([
                'texts' => ['luku.bentoTitle' => '  Novo título  ', 'homeGuest.heroLine1' => 'Olá'],
                'media' => ['luku.heroImage' => 'https://cdn.luku.com/site/x/hero.jpg'],
            ]),
        ])
        ->assertOk()
        ->json('data.guestContent');
    expect($saved['texts']['luku.bentoTitle'])->toBe('Novo título');

    // Chaves com pontos: lidas do array, não por caminho (data_get partia-as).
    $public = $this->getJson('/api/v1/site/content')->assertOk()->json('data.settings.guestContent');
    expect($public['texts']['homeGuest.heroLine1'])->toBe('Olá')
        ->and($public['media']['luku.heroImage'])->toBe('https://cdn.luku.com/site/x/hero.jpg');
});

test('guardar uma página não apaga as outras; texto vazio volta ao original', function () {
    $operator = User::factory()->systemOperator()->create();
    SiteSetting::current()->update(['guest_content' => [
        'texts' => ['luku.bentoTitle' => 'Luku', 'sobre.teamHeading' => 'Equipa'],
        'media' => [],
    ]]);

    $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/site/settings', [
            'guest_content' => ['texts' => ['luku.bentoTitle' => '', 'contacto.title' => 'Fale connosco']],
        ])
        ->assertOk();

    expect(SiteSetting::current()->guest_content['texts'])->toBe([
        'sobre.teamHeading' => 'Equipa',
        'contacto.title' => 'Fale connosco',
    ]);
});

test('sem conteúdo editado, os mapas saem como objetos vazios', function () {
    $settings = $this->getJson('/api/v1/site/content')->json('data.settings');
    expect($settings['guestContent'])->toBe(['texts' => [], 'media' => []])
        ->and($settings['lukuVideoStatus'])->toBe('ready');
    expect($this->getJson('/api/v1/site/content')->getContent())
        ->toContain('"guestContent":{"texts":{},"media":{}}');
});

test('rejeita chaves fora do formato, textos longos e imagens que não são URL', function (array $content) {
    $operator = User::factory()->systemOperator()->create();

    $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/site/settings', ['guest_content' => $content])
        ->assertStatus(422);

    expect(SiteSetting::current()->guest_content)->toBeNull();
})->with([
    'chave inválida' => [['texts' => ['<script>' => 'x']]],
    'texto longo' => [['texts' => ['luku.bentoTitle' => str_repeat('a', 601)]]],
    'imagem sem URL' => [['media' => ['luku.heroImage' => 'javascript:alert(1)']]],
]);

test('só o operador de sistema edita as páginas para visitantes', function () {
    $owner = ownerOf(Restaurant::factory()->create());

    $this->actingAs($owner, 'sanctum')
        ->postJson('/api/v1/site/settings', ['guest_content' => ['texts' => ['luku.bentoTitle' => 'x']]])
        ->assertForbidden();
});

test('vídeo da página Luku vai para o processamento com estado próprio', function () {
    Bus::fake();
    $operator = User::factory()->systemOperator()->create();

    $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/site/settings', [
            'luku_video' => UploadedFile::fake()->create('luku.mp4', 5000, 'video/mp4'),
        ])
        ->assertOk()
        ->assertJsonPath('data.lukuVideoStatus', 'processing')
        ->assertJsonPath('data.processingStatus', 'ready');

    Bus::assertDispatched(ProcessUploadedVideoJob::class, fn ($job) => $job->mediaUrlField === 'luku_video_url'
        && $job->thumbnailField === 'luku_video_poster_url'
        && $job->statusField === 'luku_video_status');
});

test('repor o vídeo da página Luku apaga o enviado e volta ao original', function () {
    $operator = User::factory()->systemOperator()->create();
    Storage::disk('r2')->put('site/1/video.mp4', 'video');
    SiteSetting::current()->update([
        'luku_video_url' => 'https://cdn.luku.com/site/1/video.mp4',
        'luku_video_poster_url' => 'https://cdn.luku.com/site/1/poster.jpg',
    ]);

    $this->actingAs($operator, 'sanctum')
        ->postJson('/api/v1/site/settings', ['luku_video_reset' => true])
        ->assertOk()
        ->assertJsonPath('data.lukuVideoUrl', null)
        ->assertJsonPath('data.lukuVideoStatus', 'ready');

    Storage::disk('r2')->assertMissing('site/1/video.mp4');
});

test('o job marca a falha na coluna de estado pedida, não na do vídeo da página Sobre', function () {
    $setting = SiteSetting::current();
    $setting->update(['luku_video_status' => 'processing', 'processing_status' => 'ready']);

    $job = new ProcessUploadedVideoJob(
        SiteSetting::class, $setting->id, 'raw-video/site/luku-video/nao-existe.mp4',
        'luku_video_url', 'luku_video_poster_url', 'site', 'luku_video_status',
    );
    $job->handle(app(VideoTranscoder::class));

    $fresh = $setting->fresh();
    expect($fresh->luku_video_status)->toBe('failed')
        ->and($fresh->processing_status)->toBe('ready');
});
