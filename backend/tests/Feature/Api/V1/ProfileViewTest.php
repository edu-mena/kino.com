<?php

use App\Models\FollowInvite;
use App\Models\ProfileView;
use App\Models\Restaurant;
use App\Models\User;
use App\Services\FollowInvitePolicy;

test('visita de cliente e de convidado ficam registadas como visitantes únicos', function () {
    $restaurant = Restaurant::factory()->create();
    $client = User::factory()->create(['name' => 'Ana Silva', 'email' => 'ana@example.com']);

    $this->actingAs($client, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views")->assertNoContent();
    // Refresh dentro da janela: mesma visita.
    $this->actingAs($client, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views")->assertNoContent();
    app('auth')->forgetGuards();
    $this->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views", ['visitor_key' => 'abc123'])->assertNoContent();

    expect(ProfileView::query()->count())->toBe(2)
        ->and(ProfileView::query()->where('user_id', $client->id)->value('visits'))->toBe(1);
});

test('voltar depois da janela de sessão conta nova visita', function () {
    $restaurant = Restaurant::factory()->create();
    $client = User::factory()->create();

    $this->actingAs($client, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views");
    $this->travel(ProfileView::SESSION_WINDOW_MINUTES + 1)->minutes();
    $this->actingAs($client, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views");

    expect(ProfileView::query()->value('visits'))->toBe(2);
});

test('o próprio staff não conta como visita', function () {
    $restaurant = Restaurant::factory()->create();
    $staff = ownerOf($restaurant);

    $this->actingAs($staff, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views")->assertNoContent();

    expect(ProfileView::query()->count())->toBe(0);
});

function visitAs(User $client, Restaurant $restaurant): void
{
    test()->actingAs($client, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views");
    app('auth')->forgetGuards();
}

test('por omissão o restaurante NÃO vê o nome de quem visitou — nem contactos', function () {
    // Auditoria de segurança, Fase 4: nome só com consentimento (ou a seguir).
    $restaurant = Restaurant::factory()->create();
    $staff = ownerOf($restaurant);
    $client = User::factory()->create(['name' => 'Ana Silva', 'email' => 'ana@example.com', 'phone' => '923000000']);
    visitAs($client, $restaurant);

    $response = $this->actingAs($staff, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views")
        ->assertOk()
        ->assertJsonPath('data.totals.total', 1)
        ->assertJsonPath('data.totals.week', 1)
        ->assertJsonPath('data.viewers.0.name', null)
        ->assertJsonPath('data.viewers.0.isGuest', false)
        // O convite "siga-nos" continua possível — vai pelo id, o
        // restaurante nunca fica a saber quem é.
        ->assertJsonPath('data.viewers.0.invite.canInvite', true);

    $json = json_encode($response->json());
    expect($json)->not->toContain('Ana Silva')->not->toContain('ana@example.com')->not->toContain('923000000');
});

test('cliente que autorizou nas preferências aparece com o nome (nunca contactos)', function () {
    $restaurant = Restaurant::factory()->create();
    $staff = ownerOf($restaurant);
    $client = User::factory()->create(['name' => 'Ana Silva', 'email' => 'ana@example.com', 'phone' => '923000000']);

    $this->actingAs($client, 'sanctum')->putJson('/api/v1/preferences', ['share_name_on_profile_visits' => true])
        ->assertSuccessful()
        ->assertJsonPath('data.shareNameOnProfileVisits', true);
    app('auth')->forgetGuards();
    visitAs($client, $restaurant);

    $response = $this->actingAs($staff, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views")
        ->assertJsonPath('data.viewers.0.name', 'Ana Silva');

    $json = json_encode($response->json());
    expect($json)->not->toContain('ana@example.com')->not->toContain('923000000');
});

test('quem já segue o restaurante aparece com o nome', function () {
    $restaurant = Restaurant::factory()->create();
    $staff = ownerOf($restaurant);
    $client = User::factory()->create(['name' => 'Ana Silva']);
    $client->followedRestaurants()->attach($restaurant->id);
    visitAs($client, $restaurant);

    $this->actingAs($staff, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views")
        ->assertJsonPath('data.viewers.0.name', 'Ana Silva')
        ->assertJsonPath('data.viewers.0.following', true);
});

test('outro restaurante não vê os visitantes', function () {
    $restaurant = Restaurant::factory()->create();
    $otherStaff = ownerOf(Restaurant::factory()->create());

    $this->actingAs($otherStaff, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views")
        ->assertForbidden();
});

test('convite chega ao cliente como notificação e não repete antes de 30 dias', function () {
    $restaurant = Restaurant::factory()->create();
    $staff = ownerOf($restaurant);
    $client = User::factory()->create();
    $view = ProfileView::query()->create([
        'restaurant_id' => $restaurant->id, 'user_id' => $client->id, 'viewer_key' => "user:{$client->id}",
        'first_at' => now(), 'last_at' => now(),
    ]);

    $this->actingAs($staff, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views/{$view->uuid}/invite")
        ->assertOk();

    $note = $client->notifications()->first();
    expect($note->event)->toBe('followInvite')->and($note->kind)->toBe('restaurant');

    $this->actingAs($staff, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views/{$view->uuid}/invite")
        ->assertUnprocessable()
        ->assertJsonPath('reason', 'recent');

    $this->travel(FollowInvitePolicy::RESEND_DAYS + 1)->days();
    $this->actingAs($staff, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views/{$view->uuid}/invite")
        ->assertOk();
});

test('convidado sem conta e quem já segue não podem ser convidados', function () {
    $restaurant = Restaurant::factory()->create();
    $staff = ownerOf($restaurant);
    $guestView = ProfileView::query()->create([
        'restaurant_id' => $restaurant->id, 'viewer_key' => 'guest:x', 'first_at' => now(), 'last_at' => now(),
    ]);
    $follower = User::factory()->create();
    $restaurant->followers()->attach($follower->id);
    $followerView = ProfileView::query()->create([
        'restaurant_id' => $restaurant->id, 'user_id' => $follower->id, 'viewer_key' => "user:{$follower->id}",
        'first_at' => now(), 'last_at' => now(),
    ]);

    $this->actingAs($staff, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views/{$guestView->uuid}/invite")
        ->assertUnprocessable()->assertJsonPath('reason', 'guest');
    $this->actingAs($staff, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views/{$followerView->uuid}/invite")
        ->assertUnprocessable()->assertJsonPath('reason', 'following');
});

test('"Agora não" bloqueia 90 dias e silenciar bloqueia sempre', function () {
    $restaurant = Restaurant::factory()->create();
    $staff = ownerOf($restaurant);
    $client = User::factory()->create();
    $view = ProfileView::query()->create([
        'restaurant_id' => $restaurant->id, 'user_id' => $client->id, 'viewer_key' => "user:{$client->id}",
        'first_at' => now(), 'last_at' => now(),
    ]);
    $invite = fn () => $this->actingAs($staff, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views/{$view->uuid}/invite");

    $invite()->assertOk();
    $this->actingAs($client, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/follow-invite/decline")->assertNoContent();

    $this->travel(FollowInvitePolicy::RESEND_DAYS + 1)->days();
    $invite()->assertUnprocessable()->assertJsonPath('reason', 'declined');

    $this->travel(FollowInvitePolicy::DECLINE_COOLDOWN_DAYS)->days();
    $invite()->assertOk();

    $this->actingAs($client, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/follow-invite/mute")->assertNoContent();
    $this->travel(365)->days();
    $invite()->assertUnprocessable()->assertJsonPath('reason', 'muted');
});

test('silenciar sem convite prévio não conta para o limite diário', function () {
    $restaurant = Restaurant::factory()->create();
    $client = User::factory()->create();

    $this->actingAs($client, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/follow-invite/mute")->assertNoContent();

    expect(app(FollowInvitePolicy::class)->sentToday($restaurant))->toBe(0);
});

test('limite diário de convites por restaurante', function () {
    $restaurant = Restaurant::factory()->create();
    $staff = ownerOf($restaurant);
    foreach (User::factory()->count(FollowInvitePolicy::DAILY_CAP)->create() as $u) {
        FollowInvite::query()->create(['restaurant_id' => $restaurant->id, 'user_id' => $u->id, 'last_sent_at' => now()]);
    }
    $client = User::factory()->create();
    $view = ProfileView::query()->create([
        'restaurant_id' => $restaurant->id, 'user_id' => $client->id, 'viewer_key' => "user:{$client->id}",
        'first_at' => now(), 'last_at' => now(),
    ]);

    $this->actingAs($staff, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/profile-views/{$view->uuid}/invite")
        ->assertUnprocessable()->assertJsonPath('reason', 'daily_cap');
});

test('seguir depois de um convite marca-o como aceite', function () {
    $restaurant = Restaurant::factory()->create();
    $client = User::factory()->create();
    FollowInvite::query()->create(['restaurant_id' => $restaurant->id, 'user_id' => $client->id, 'last_sent_at' => now()]);

    $this->actingAs($client, 'sanctum')->postJson("/api/v1/restaurants/{$restaurant->uuid}/follow")->assertOk();

    expect(FollowInvite::query()->value('accepted_at'))->not->toBeNull();
});
