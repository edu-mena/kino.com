<?php

use App\Jobs\ProcessUploadedVideoJob;
use App\Models\Restaurant;
use App\Models\RestaurantStory;
use App\Services\VideoTranscoder;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    Storage::fake('r2', ['url' => 'https://cdn.luku.com']);
});

test('numa falha transitória, o ficheiro bruto NÃO é apagado — fica disponível para a tentativa seguinte', function () {
    // Regressão do bug encontrado em revisão cruzada: cleanupRaw() corria
    // no finally de TODA tentativa, não só na terminal — $tries=2 fingia
    // existir retry mas a 2ª tentativa nunca encontrava o ficheiro.
    $restaurant = Restaurant::factory()->create();
    $story = RestaurantStory::factory()->for($restaurant)->create([
        'processing_status' => 'processing', 'media_url' => '',
    ]);
    $rawPath = 'raw-video/story/x/fake.mp4';
    Storage::disk('local')->put($rawPath, 'fake video bytes');

    $transcoder = Mockery::mock(VideoTranscoder::class);
    $transcoder->shouldReceive('transcode')->once()->andThrow(new RuntimeException('ffmpeg indisponível'));
    $this->app->instance(VideoTranscoder::class, $transcoder);

    $job = new ProcessUploadedVideoJob(RestaurantStory::class, $story->id, $rawPath, 'media_url', null, 'stories');

    expect(fn () => $job->handle(app(VideoTranscoder::class)))->toThrow(RuntimeException::class);

    Storage::disk('local')->assertExists($rawPath);
    // Não marca "failed" numa tentativa transitória — só failed() faz isso,
    // e só depois de esgotadas as $tries (ver máquina de retry do Horizon).
    expect($story->fresh()->processing_status)->toBe('processing');
});

test('failed() (esgotadas as tentativas) marca failed e SÓ AÍ apaga o ficheiro bruto', function () {
    $restaurant = Restaurant::factory()->create();
    $story = RestaurantStory::factory()->for($restaurant)->create([
        'processing_status' => 'processing', 'media_url' => '',
    ]);
    $rawPath = 'raw-video/story/x/fake.mp4';
    Storage::disk('local')->put($rawPath, 'fake video bytes');

    $job = new ProcessUploadedVideoJob(RestaurantStory::class, $story->id, $rawPath, 'media_url', null, 'stories');
    $job->failed(new RuntimeException('esgotou as tentativas'));

    expect($story->fresh()->processing_status)->toBe('failed');
    Storage::disk('local')->assertMissing($rawPath);
});

test('sucesso: publica no R2, marca ready, e só então apaga o bruto', function () {
    $restaurant = Restaurant::factory()->create();
    $story = RestaurantStory::factory()->for($restaurant)->create([
        'processing_status' => 'processing', 'media_url' => '',
    ]);
    $rawPath = 'raw-video/story/x/fake.mp4';
    Storage::disk('local')->put($rawPath, 'fake video bytes');

    $transcoder = Mockery::mock(VideoTranscoder::class);
    $transcoder->shouldReceive('transcode')->once()->andReturnUsing(
        fn ($in, $out) => file_put_contents($out, 'transcoded bytes'),
    );
    $this->app->instance(VideoTranscoder::class, $transcoder);

    $job = new ProcessUploadedVideoJob(RestaurantStory::class, $story->id, $rawPath, 'media_url', null, 'stories');
    $job->handle(app(VideoTranscoder::class));

    $story->refresh();
    expect($story->processing_status)->toBe('ready');
    expect($story->media_url)->toStartWith('https://cdn.luku.com/stories/');
    Storage::disk('local')->assertMissing($rawPath);
});
