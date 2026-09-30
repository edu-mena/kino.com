<?php

use App\Models\ContactMessage;
use App\Models\CustomerNote;
use App\Models\IdempotencyKey;
use App\Models\Notification;
use App\Models\PartnerApplication;
use App\Models\ProfileView;
use App\Models\Restaurant;
use App\Models\Review;
use App\Models\SystemSecurityEvent;
use App\Models\User;
use App\Services\AccountDeletionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/*
 * Direitos do titular dos dados e retenção — auditoria de segurança, Fase 3.
 */

function customerWithHistory(): array
{
    $user = User::factory()->create(['email' => 'ana@example.com', 'phone' => '923000000']);
    $restaurant = Restaurant::factory()->create();

    $order = $restaurant->orders()->create([
        'user_id' => $user->id, 'fulfillment_type' => 'delivery', 'status' => 'delivered',
        'customer_name' => 'Ana', 'customer_phone' => '923000000', 'customer_email' => 'ana@example.com',
        'delivery_address_snapshot' => ['line1' => 'Rua da Ana 1'], 'note' => 'Portão azul',
        'subtotal' => 5000, 'total' => 5500,
    ]);
    $user->savedAddresses()->create(['label' => 'Casa', 'line1' => 'Rua da Ana 1']);
    $user->companies()->create(['name' => 'Ana Lda', 'nif' => '5000000000', 'email' => 'f@ana.ao']);
    Review::query()->create(['restaurant_id' => $restaurant->id, 'user_id' => $user->id, 'customer_name' => 'Ana', 'rating' => 5, 'date' => now()]);
    CustomerNote::query()->create(['restaurant_id' => $restaurant->id, 'customer_key' => 'ana@example.com', 'notes' => 'Alérgica a marisco']);
    ProfileView::query()->create(['restaurant_id' => $restaurant->id, 'user_id' => $user->id, 'viewer_key' => "user:{$user->id}", 'visits' => 3, 'first_at' => now(), 'last_at' => now()]);
    $user->createToken('t');

    return [$user, $restaurant, $order];
}

test('export devolve os dados da própria conta', function () {
    [$user] = customerWithHistory();

    $this->actingAs($user, 'sanctum')->getJson('/api/v1/me/export')
        ->assertOk()
        ->assertHeader('Content-Disposition', 'attachment; filename="luku-os-meus-dados.json"')
        ->assertJsonPath('data.profile.email', 'ana@example.com')
        ->assertJsonPath('data.orders.0.note', 'Portão azul')
        ->assertJsonPath('data.savedAddresses.0.line1', 'Rua da Ana 1')
        ->assertJsonPath('data.companies.0.nif', '5000000000')
        ->assertJsonPath('data.restaurantProfileVisits.0.visits', 3);
});

test('apagar conta exige confirmação explícita', function () {
    [$user] = customerWithHistory();

    $this->actingAs($user, 'sanctum')->deleteJson('/api/v1/me')->assertStatus(422);
    expect(User::query()->find($user->id))->not->toBeNull();
});

test('apagar conta remove os dados pessoais e anonimiza o que é do restaurante', function () {
    [$user, $restaurant, $order] = customerWithHistory();
    $uid = $user->id;

    $this->actingAs($user, 'sanctum')->deleteJson('/api/v1/me', ['confirm' => true])->assertOk();

    // A conta desaparece de facto (não soft delete).
    expect(User::withTrashed()->find($uid))->toBeNull()
        ->and(DB::table('personal_access_tokens')->where('tokenable_id', $uid)->count())->toBe(0)
        ->and(DB::table('saved_addresses')->where('user_id', $uid)->count())->toBe(0)
        ->and(DB::table('companies')->where('user_id', $uid)->count())->toBe(0)
        ->and(ProfileView::query()->count())->toBe(0)
        ->and(CustomerNote::query()->count())->toBe(0);

    // O pedido fica para o restaurante (valores), sem nada que identifique a pessoa.
    $order->refresh();
    expect($order->user_id)->toBeNull()
        ->and($order->customer_name)->toBe(AccountDeletionService::ANONYMOUS_NAME)
        ->and($order->customer_phone)->toBe('')
        ->and($order->customer_email)->toBeNull()
        ->and($order->delivery_address_snapshot)->toBeNull()
        ->and($order->note)->toBeNull()
        ->and((float) $order->total)->toBe(5500.0);

    $review = Review::query()->first();
    expect($review->user_id)->toBeNull()->and($review->customer_name)->toBe(AccountDeletionService::ANONYMOUS_NAME);
});

test('apagar conta não notifica o restaurante (não é uma mudança de pedido)', function () {
    [$user, $restaurant] = customerWithHistory();
    $restaurantNotifications = fn () => Notification::query()->where('restaurant_id', $restaurant->id)->whereNull('user_id')->count();
    $before = $restaurantNotifications();

    $this->actingAs($user, 'sanctum')->deleteJson('/api/v1/me', ['confirm' => true])->assertOk();

    // As do próprio cliente saem em cascata; as do restaurante não mudam.
    expect($restaurantNotifications())->toBe($before)
        ->and(Notification::query()->where('user_id', $user->id)->count())->toBe(0);
});

test('dono de restaurante e operador não apagam a conta por aqui', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $operator = User::factory()->systemOperator()->create();

    $this->actingAs($owner, 'sanctum')->deleteJson('/api/v1/me', ['confirm' => true])->assertStatus(422);
    $this->actingAs($operator, 'sanctum')->deleteJson('/api/v1/me', ['confirm' => true])->assertForbidden();

    expect(User::query()->whereIn('id', [$owner->id, $operator->id])->count())->toBe(2);
});

test('staff que não é dono pode apagar a conta — sai da equipa', function () {
    $restaurant = Restaurant::factory()->create();
    $staff = User::factory()->restaurantStaff()->create();
    $restaurant->staff()->attach($staff->id, ['role_in_restaurant' => 'staff']);

    $this->actingAs($staff, 'sanctum')->deleteJson('/api/v1/me', ['confirm' => true])->assertOk();

    expect($restaurant->staff()->count())->toBe(0);
});

test('model:prune aplica os prazos de retenção e deixa os dados recentes', function () {
    $restaurant = Restaurant::factory()->create();
    $this->travelTo(now()->subMonths(13));
    IdempotencyKey::query()->create(['owner_key' => 'x', 'idempotency_key' => (string) Str::uuid(), 'endpoint' => 'e', 'response_status' => 201, 'response_body' => []]);
    ProfileView::query()->create(['restaurant_id' => $restaurant->id, 'viewer_key' => 'guest:a', 'visits' => 1, 'first_at' => now(), 'last_at' => now()]);
    SystemSecurityEvent::factory()->create();
    ContactMessage::query()->create(['name' => 'X', 'email' => 'x@x.com', 'subject' => 's', 'message' => 'm']);
    $rejected = PartnerApplication::factory()->create(['status' => 'rejected']);
    $approved = PartnerApplication::factory()->create(['status' => 'approved']);
    $this->travelBack();

    SystemSecurityEvent::factory()->create(); // recente — fica

    $this->artisan('model:prune')->assertSuccessful();

    expect(IdempotencyKey::query()->count())->toBe(0)
        ->and(ProfileView::query()->count())->toBe(0)
        ->and(SystemSecurityEvent::query()->count())->toBe(1)
        ->and(ContactMessage::query()->count())->toBe(0)
        ->and(PartnerApplication::query()->find($rejected->id))->toBeNull()
        ->and(PartnerApplication::query()->find($approved->id))->not->toBeNull();
});

test('anonimização de convidados fica desligada sem prazo definido', function () {
    $restaurant = Restaurant::factory()->create();
    $this->travelTo(now()->subYear());
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'status' => 'completed', 'pickup_asap' => true,
        'customer_name' => 'Convidado', 'customer_phone' => '911', 'subtotal' => 1, 'total' => 1,
        'guest_token' => (string) Str::uuid(),
    ]);
    $this->travelBack();

    $this->artisan('privacy:anonymize-guests')->assertSuccessful();
    expect($order->fresh()->customer_name)->toBe('Convidado');

    config(['privacy.guest_retention_days' => 180]);
    $this->artisan('privacy:anonymize-guests')->assertSuccessful();
    expect($order->fresh()->customer_name)->toBe(AccountDeletionService::ANONYMOUS_NAME)
        ->and($order->fresh()->customer_phone)->toBe('');
});

test('anonimização de convidados não toca em reservas recentes nem futuras', function () {
    config(['privacy.guest_retention_days' => 180]);
    $restaurant = Restaurant::factory()->create();
    $recent = $restaurant->reservations()->create([
        'customer_name' => 'Recente', 'customer_phone' => '911', 'date' => now()->toDateString(),
        'time' => '20:00', 'people_count' => 2, 'status' => 'canceled', 'guest_token' => (string) Str::uuid(),
    ]);

    $this->artisan('privacy:anonymize-guests')->assertSuccessful();

    expect($recent->fresh()->customer_name)->toBe('Recente');
});
