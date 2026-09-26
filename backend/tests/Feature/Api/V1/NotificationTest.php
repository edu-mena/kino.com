<?php

use App\Events\NotificationCreated;
use App\Models\Notification;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

test('criar um pedido gera notificação para o restaurante E para o cliente autenticado', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();

    $restaurant->orders()->create([
        'user_id' => $user->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $user->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);

    expect(Notification::where('restaurant_id', $restaurant->id)->where('event', 'orderNew')->exists())->toBeTrue();
    expect(Notification::where('user_id', $user->id)->where('event', 'orderNew')->exists())->toBeTrue();
});

test('pedido de convidado (sem user_id) só gera notificação para o restaurante', function () {
    $restaurant = Restaurant::factory()->create();

    $restaurant->orders()->create([
        'guest_token' => Str::uuid(), 'fulfillment_type' => 'takeaway',
        'customer_name' => 'Convidado', 'customer_phone' => '900', 'pickup_asap' => true,
        'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
    ]);

    expect(Notification::where('restaurant_id', $restaurant->id)->count())->toBe(1);
    expect(Notification::whereNotNull('user_id')->count())->toBe(0);
});

test('mudar o status de um pedido gera uma NOVA notificação orderStatus (não sobrescreve a orderNew)', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();
    $order = $restaurant->orders()->create([
        'user_id' => $user->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $user->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);

    $order->update(['status' => 'accepted']);

    expect(Notification::where('user_id', $user->id)->count())->toBe(2);
    expect(Notification::where('user_id', $user->id)->where('event', 'orderStatus')->exists())->toBeTrue();
});

test('atualizar um pedido sem mudar o status não gera notificação extra', function () {
    $restaurant = Restaurant::factory()->create();
    $order = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
        'guest_token' => Str::uuid(),
    ]);
    $countBefore = Notification::count();

    $order->update(['note' => 'sem cebola']);

    expect(Notification::count())->toBe($countBefore);
});

test('cliente só marca como lidas as próprias notificações; cross-user é 404', function () {
    $restaurant = Restaurant::factory()->create();
    $userA = User::factory()->create();
    $userB = User::factory()->create();
    $restaurant->orders()->create([
        'user_id' => $userA->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $userA->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);
    $notification = Notification::where('user_id', $userA->id)->firstOrFail();

    $this->actingAs($userB, 'sanctum')
        ->patchJson("/api/v1/notifications/{$notification->uuid}/read")
        ->assertStatus(404);

    $this->actingAs($userA, 'sanctum')
        ->patchJson("/api/v1/notifications/{$notification->uuid}/read")
        ->assertOk()->assertJsonPath('data.readAt', fn ($v) => $v !== null);
});

test('markManyRead só marca as que pertencem ao próprio user, ignora ids de outra conta', function () {
    $restaurant = Restaurant::factory()->create();
    $userA = User::factory()->create();
    $userB = User::factory()->create();
    $restaurant->orders()->create([
        'user_id' => $userA->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $userA->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);
    $restaurant->orders()->create([
        'user_id' => $userB->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $userB->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);
    $notifA = Notification::where('user_id', $userA->id)->firstOrFail();
    $notifB = Notification::where('user_id', $userB->id)->firstOrFail();

    $this->actingAs($userA, 'sanctum')
        ->postJson('/api/v1/notifications/read', ['ids' => [$notifA->uuid, $notifB->uuid]])
        ->assertOk()->assertJsonPath('data.updated', 1);

    expect($notifA->fresh()->read_at)->not->toBeNull();
    expect($notifB->fresh()->read_at)->toBeNull();
});

test('notificação devolve o uuid público do pedido de origem em refId', function () {
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();
    $order = $restaurant->orders()->create([
        'user_id' => $user->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $user->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);

    // A notificação do CLIENTE não tem restaurant_id (só a do restaurante
    // tem, ver OrderObserver::notify) — o frontend resolve o restaurante
    // via refId contra os próprios pedidos já carregados, não por aqui.
    $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonPath('data.0.refId', $order->uuid)
        ->assertJsonPath('data.0.restaurantId', null);

    $owner = ownerOf($restaurant);
    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/notifications")
        ->assertOk()
        ->assertJsonPath('data.0.refId', $order->uuid)
        ->assertJsonPath('data.0.restaurantId', $restaurant->uuid);
});

test('criar um pedido não falha quando o cliente tem um device token Android mas FCM não está configurado', function () {
    Config::set('firebase.projects.app.credentials', null);

    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();
    $user->deviceTokens()->create(['platform' => 'android', 'token' => 'fcm-token-fake']);

    // Cria o pedido direto no Eloquent (dispara o OrderObserver::created a
    // sério, incl. SendPushNotificationJob para o token Android acima) sem
    // depender do endpoint HTTP inteiro — o que se quer testar é só que o
    // envio de push sem credenciais Firebase não rebenta nada.
    $restaurant->orders()->create([
        'user_id' => $user->id,
        'fulfillment_type' => 'takeaway',
        'customer_name' => $user->name,
        'customer_phone' => '900',
        'pickup_asap' => true,
        'status' => 'pending',
        'subtotal' => 1000,
        'total' => 1000,
    ]);

    expect(Notification::where('user_id', $user->id)->where('event', 'orderNew')->exists())->toBeTrue();
});

test('notificação de pedido expõe itemCount/total no snapshot — conteúdo específico, não genérico', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    // Mesma estrutura de OrderController::store(): pedido criado, DEPOIS as
    // linhas, tudo na mesma transação — é o que fez o snapshot sair sempre a
    // zero antes de OrderObserver implementar ShouldHandleEventsAfterCommit.
    DB::transaction(function () use ($restaurant) {
        $order = $restaurant->orders()->create([
            'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
            'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 2000, 'total' => 2500,
            'guest_token' => Str::uuid(),
        ]);
        $order->lines()->create([
            'item_name_snapshot' => 'Muamba', 'unit_price_snapshot' => 1000, 'qty' => 2, 'line_total' => 2000,
        ]);
    });

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/notifications")
        ->assertOk()
        ->assertJsonPath('data.0.snapshot.itemCount', 1)
        ->assertJsonPath('data.0.snapshot.total', 2500)
        ->assertJsonPath('data.0.status', 'pending');
});

test('notificação de reserva expõe peopleCount/date/time no snapshot', function () {
    $restaurant = Restaurant::factory()->create(['accepts_reservations' => true]);
    $owner = ownerOf($restaurant);
    $restaurant->reservations()->create([
        'customer_name' => 'Ana', 'customer_phone' => '900',
        'date' => now()->addDay()->toDateString(), 'time' => '19:30',
        'people_count' => 4, 'status' => 'pending', 'status_updated_at' => now(),
    ]);

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/notifications")
        ->assertOk()
        ->assertJsonPath('data.0.snapshot.peopleCount', 4)
        ->assertJsonPath('data.0.snapshot.time', '19:30')
        ->assertJsonPath('data.0.status', 'pending');
});

test('notificação antiga (status_snapshot em texto simples) continua a devolver status certo, snapshot null', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    Notification::query()->create([
        'restaurant_id' => $restaurant->id, 'kind' => 'order', 'ref_id' => 1,
        'event' => 'orderNew', 'status_snapshot' => 'pending',
    ]);

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/notifications")
        ->assertOk()
        ->assertJsonPath('data.0.status', 'pending')
        ->assertJsonPath('data.0.snapshot', null);
});

test('criar uma notificação transmite NotificationCreated no canal certo (Fase N3)', function () {
    Event::fake([NotificationCreated::class]);
    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();

    $restaurant->orders()->create([
        'user_id' => $user->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $user->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending',
        'subtotal' => 1000, 'total' => 1000,
    ]);

    Event::assertDispatched(
        NotificationCreated::class,
        fn (NotificationCreated $e) => $e->notification->restaurant_id === $restaurant->id
            && $e->notification->user_id === null,
    );
    Event::assertDispatched(
        NotificationCreated::class,
        fn (NotificationCreated $e) => $e->notification->user_id === $user->id,
    );

    // Canal certo por dono — restaurante transmite em Restaurant.{id}, o
    // cliente em User.{id} (nunca os dois na mesma notificação).
    $restaurantNotification = Notification::where('restaurant_id', $restaurant->id)->firstOrFail();
    $customerNotification = Notification::where('user_id', $user->id)->firstOrFail();
    expect((new NotificationCreated($restaurantNotification))->broadcastOn()[0]->name)
        ->toBe("private-App.Models.Restaurant.{$restaurant->uuid}");
    expect((new NotificationCreated($customerNotification))->broadcastOn()[0]->name)
        ->toBe("private-App.Models.User.{$user->uuid}");
});

test('falha ao transmitir a notificação (Reverb inalcançável) NÃO derruba a criação do pedido', function () {
    // Simula uma falha na transmissão em tempo real (Reverb em baixo/mal
    // configurado) registando um listener que rebenta — o dispatcher do
    // Laravel corre todos os listeners de um evento na mesma chamada, por
    // isso isto propaga exatamente como uma falha real do broadcaster
    // propagaria. Bug real que já aconteceu em produção: sem o try/catch
    // em NotificationObserver, isto derrubava o pedido inteiro com 500.
    Event::listen(NotificationCreated::class, function () {
        throw new RuntimeException('reverb unreachable (simulado)');
    });

    $restaurant = Restaurant::factory()->create();
    $response = $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
        'guest_token' => Str::uuid(),
    ]);

    expect($response->exists)->toBeTrue();
    expect(Notification::where('restaurant_id', $restaurant->id)->where('event', 'orderNew')->exists())
        ->toBeTrue();
});

test('sino do restaurante só mostra as notificações do próprio restaurante, staff de outro não acede', function () {
    $restaurant = Restaurant::factory()->create();
    $otherRestaurant = Restaurant::factory()->create();
    $restaurant->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
        'guest_token' => Str::uuid(),
    ]);
    $owner = ownerOf($restaurant);
    $otherOwner = ownerOf($otherRestaurant);

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/notifications")
        ->assertOk()->assertJsonCount(1, 'data');

    $this->actingAs($otherOwner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/notifications")
        ->assertForbidden();
});
