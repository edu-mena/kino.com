<?php

use App\Mail\ContentReportedMail;
use App\Models\ContentReport;
use App\Models\Restaurant;
use App\Models\RestaurantStory;
use App\Models\Review;
use App\Models\User;
use App\Models\UserBlock;
use App\Services\ModerationService;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

/*
 * Moderação de conteúdo (App Store 1.2): denunciar, esconder, decidir, bloquear.
 */

beforeEach(function () {
    Mail::fake();
    $this->withoutMiddleware(ThrottleRequests::class);
    $this->restaurant = Restaurant::factory()->create();
});

function reviewBy(User $author, Restaurant $restaurant, array $attrs = []): Review
{
    return Review::query()->create([
        'restaurant_id' => $restaurant->id, 'user_id' => $author->id, 'customer_name' => $author->name,
        'rating' => 1, 'date' => now(), 'comment' => 'texto', ...$attrs,
    ]);
}

test('qualquer pessoa (até convidado) denuncia uma avaliação; a equipa recebe email uma só vez', function () {
    $review = reviewBy(User::factory()->create(), $this->restaurant);

    $this->postJson("/api/v1/reports/review/{$review->uuid}", ['reason' => 'offensive', 'details' => 'insulto'])
        ->assertCreated();
    $this->actingAs(User::factory()->create(), 'sanctum')
        ->postJson("/api/v1/reports/review/{$review->uuid}", ['reason' => 'spam'])->assertCreated();

    expect(ContentReport::query()->count())->toBe(2);
    Mail::assertQueued(ContentReportedMail::class, 1);
});

test('denunciar duas vezes o mesmo conteúdo não soma', function () {
    $review = reviewBy(User::factory()->create(), $this->restaurant);
    $reporter = User::factory()->create();

    foreach (range(1, 3) as $_) {
        $this->actingAs($reporter, 'sanctum')
            ->postJson("/api/v1/reports/review/{$review->uuid}", ['reason' => 'offensive'])->assertCreated();
    }

    expect(ContentReport::query()->count())->toBe(1)->and($review->fresh()->hidden_at)->toBeNull();
});

test('avaliação denunciada por 3 pessoas diferentes sai logo do público', function () {
    $review = reviewBy(User::factory()->create(), $this->restaurant);

    foreach (range(1, ModerationService::AUTO_HIDE_AFTER) as $_) {
        $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson("/api/v1/reports/review/{$review->uuid}", ['reason' => 'offensive'])->assertCreated();
    }
    app('auth')->forgetGuards();

    expect($review->fresh()->hidden_at)->not->toBeNull();
    $this->getJson("/api/v1/restaurants/{$this->restaurant->uuid}/reviews")->assertJsonCount(0, 'data');
});

test('a equipa vê a fila e decide: remover esconde, rejeitar repõe', function () {
    $operator = User::factory()->systemOperator()->create();
    $review = reviewBy(User::factory()->create(), $this->restaurant, ['comment' => 'insulto']);
    app(ModerationService::class)->report('review', $review, null, '1.2.3.4', 'offensive', 'feio');

    $this->actingAs($operator, 'sanctum')->getJson('/api/v1/content-reports')
        ->assertOk()
        ->assertJsonPath('data.0.type', 'review')
        ->assertJsonPath('data.0.preview.text', 'insulto')
        ->assertJsonPath('data.0.reportsCount', 1);

    $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/content-reports/review/{$review->uuid}/resolve", ['action' => 'remove'])->assertOk();
    expect($review->fresh()->hidden_at)->not->toBeNull()
        ->and(ContentReport::query()->value('status'))->toBe('removed');

    // Nova denúncia, rejeitada: volta a aparecer.
    app(ModerationService::class)->report('review', $review, null, '5.6.7.8', 'spam', null);
    $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/content-reports/review/{$review->uuid}/resolve", ['action' => 'dismiss'])->assertOk();
    expect($review->fresh()->hidden_at)->toBeNull();
});

test('remover uma story denunciada apaga-a com o ficheiro', function () {
    Storage::fake('r2', ['url' => 'https://cdn.luku.com']);
    Storage::disk('r2')->put('story/x.jpg', 'img');
    $story = RestaurantStory::factory()->create(['restaurant_id' => $this->restaurant->id, 'media_url' => 'https://cdn.luku.com/story/x.jpg']);
    $operator = User::factory()->systemOperator()->create();

    $this->postJson("/api/v1/reports/story/{$story->uuid}", ['reason' => 'offensive'])->assertCreated();
    $this->actingAs($operator, 'sanctum')
        ->postJson("/api/v1/content-reports/story/{$story->uuid}/resolve", ['action' => 'remove'])->assertOk();

    expect(RestaurantStory::query()->find($story->id))->toBeNull();
    Storage::disk('r2')->assertMissing('story/x.jpg');
});

test('só a equipa vê a fila e decide', function () {
    $staff = ownerOf($this->restaurant);
    $review = reviewBy(User::factory()->create(), $this->restaurant);

    $this->actingAs($staff, 'sanctum')->getJson('/api/v1/content-reports')->assertForbidden();
    $this->actingAs($staff, 'sanctum')
        ->postJson("/api/v1/content-reports/review/{$review->uuid}/resolve", ['action' => 'remove'])->assertForbidden();
});

test('motivo inválido ou tipo inexistente são recusados', function () {
    $review = reviewBy(User::factory()->create(), $this->restaurant);

    $this->postJson("/api/v1/reports/review/{$review->uuid}", ['reason' => 'nao-existe'])->assertStatus(422);
    $this->postJson("/api/v1/reports/user/{$review->uuid}", ['reason' => 'spam'])->assertNotFound();
});

test('bloquear o autor esconde as avaliações dele só para quem bloqueou', function () {
    $author = User::factory()->create(['name' => 'Chato']);
    $me = User::factory()->create();
    $review = reviewBy($author, $this->restaurant);
    reviewBy(User::factory()->create(), $this->restaurant);
    $url = "/api/v1/restaurants/{$this->restaurant->uuid}/reviews";

    $this->actingAs($me, 'sanctum')->getJson($url)->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.authorBlockable', true);
    $this->actingAs($me, 'sanctum')->postJson("/api/v1/reviews/{$review->uuid}/block-author")->assertCreated();

    $this->actingAs($me, 'sanctum')->getJson($url)->assertJsonCount(1, 'data');
    app('auth')->forgetGuards();
    $this->getJson($url)->assertJsonCount(2, 'data'); // os outros continuam a ver

    $block = UserBlock::query()->first();
    $this->actingAs($me, 'sanctum')->getJson('/api/v1/me/blocks')->assertJsonPath('data.0.name', 'Chato');
    $this->actingAs($me, 'sanctum')->deleteJson("/api/v1/me/blocks/{$block->uuid}")->assertNoContent();
    $this->actingAs($me, 'sanctum')->getJson($url)->assertJsonCount(2, 'data');
});

test('não se bloqueia a si próprio nem desbloqueia o bloqueio de outra pessoa', function () {
    $me = User::factory()->create();
    $mine = reviewBy($me, $this->restaurant);
    $otherBlock = UserBlock::query()->create(['user_id' => User::factory()->create()->id, 'blocked_user_id' => $me->id]);

    $this->actingAs($me, 'sanctum')->postJson("/api/v1/reviews/{$mine->uuid}/block-author")->assertStatus(422);
    $this->actingAs($me, 'sanctum')->deleteJson("/api/v1/me/blocks/{$otherBlock->uuid}")->assertNotFound();
});
