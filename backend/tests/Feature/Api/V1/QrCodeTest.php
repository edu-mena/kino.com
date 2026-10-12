<?php

use App\Models\MenuItem;
use App\Models\PaymentMethod;
use App\Models\QrCode;
use App\Models\Restaurant;
use App\Models\RestaurantMenu;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Support\Str;

test('QR de mesa abre o restaurante e a mesa sem sessão, e conta a leitura', function () {
    $restaurant = Restaurant::factory()->create(['name' => 'Tasca do Rui', 'logo_url' => 'https://cdn.test/logo.png']);
    $table = RestaurantTable::factory()->for($restaurant)->create(['name' => 'Mesa 7', 'area' => 'Esplanada', 'seats' => 4]);
    $code = $table->qrCode()->value('code');

    $this->getJson('/api/v1/qr/'.strtolower($code))
        ->assertOk()
        ->assertJsonPath('data.kind', 'table')
        ->assertJsonPath('data.restaurant.id', $restaurant->uuid)
        ->assertJsonPath('data.restaurant.name', 'Tasca do Rui')
        ->assertJsonPath('data.restaurant.logoUrl', 'https://cdn.test/logo.png')
        ->assertJsonPath('data.table.id', $table->uuid)
        ->assertJsonPath('data.table.name', 'Mesa 7')
        ->assertJsonPath('data.combinedWith', []);

    expect(QrCode::query()->where('code', $code)->value('scans'))->toBe(1);

    // Pré-visualização do painel não conta.
    $this->getJson("/api/v1/qr/{$code}?preview=1")->assertOk();
    expect(QrCode::query()->where('code', $code)->value('scans'))->toBe(1);
});

test('QR de mesa junta hoje mostra com quem está junta', function () {
    $restaurant = Restaurant::factory()->create();
    $a = RestaurantTable::factory()->for($restaurant)->create(['name' => 'Mesa 3']);
    $b = RestaurantTable::factory()->for($restaurant)->create(['name' => 'Mesa 4']);
    $combination = $restaurant->tableCombinations()->create(['date' => now('Africa/Luanda')->toDateString(), 'seats' => 8]);
    $combination->syncTables([$a->id, $b->id]);

    $this->getJson('/api/v1/qr/'.$b->qrCode()->value('code'))
        ->assertOk()
        ->assertJsonPath('data.combinedWith', ['Mesa 3']);
});

test('código desconhecido ou de restaurante apagado dá 404', function () {
    $this->getJson('/api/v1/qr/ZZZZZZZ')->assertNotFound();

    $restaurant = Restaurant::factory()->create();
    $qr = QrCode::forRestaurant($restaurant);
    $restaurant->delete();

    $this->getJson("/api/v1/qr/{$qr->code}")->assertNotFound();
});

test('staff obtém o QR geral (criado se faltar) e grava o estilo de impressão', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);

    $code = $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/qr-codes")
        ->assertOk()
        ->json('data.restaurant.code');

    expect($code)->toMatch('/^[2-9A-HJKMNP-Z]{7}$/');

    // Pedir de novo devolve o MESMO código — um QR impresso não muda.
    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/qr-codes")
        ->assertJsonPath('data.restaurant.code', $code);

    $this->actingAs($owner, 'sanctum')
        ->putJson("/api/v1/restaurants/{$restaurant->uuid}/qr-style", ['style' => [
            'template' => 'bold', 'format' => 'tent', 'color' => '#E85D04',
            'showLogo' => true, 'wifiName' => 'Tasca', 'wifiPassword' => 'bemvindo', 'evil' => 'x',
        ]])
        ->assertOk()
        ->assertJsonPath('data.style.template', 'bold')
        ->assertJsonMissingPath('data.style.evil');

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/qr-codes")
        ->assertJsonPath('data.style.format', 'tent')
        ->assertJsonPath('data.style.wifiName', 'Tasca');

    // O estilo (com a senha do Wi-Fi) nunca sai na leitura pública.
    $this->getJson("/api/v1/restaurants/{$restaurant->uuid}")
        ->assertOk()
        ->assertJsonMissingPath('data.qrStyle');
});

test('estilo inválido é recusado e só o staff o pode gravar', function () {
    $restaurant = Restaurant::factory()->create();
    $owner = ownerOf($restaurant);
    $stranger = User::factory()->create();

    $this->actingAs($owner, 'sanctum')
        ->putJson("/api/v1/restaurants/{$restaurant->uuid}/qr-style", ['style' => ['color' => 'red', 'template' => 'neon']])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['style.color', 'style.template']);

    $this->actingAs($stranger, 'sanctum')
        ->putJson("/api/v1/restaurants/{$restaurant->uuid}/qr-style", ['style' => ['template' => 'bold']])
        ->assertForbidden();

    $this->actingAs($stranger, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/qr-codes")
        ->assertForbidden();
});

test('pedido no local feito pelo QR leva a mesa (e a junção do dia) até ao painel', function () {
    PaymentMethod::query()->firstOrCreate(['code' => 'cash'], ['name' => 'Numerário', 'is_digital' => false, 'position' => 1]);
    $restaurant = Restaurant::factory()->create([
        'fulfillment_modes' => ['takeaway', 'dinein'],
        'orders_paused_manually' => false,
    ]);
    $owner = ownerOf($restaurant);
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 2500]);
    $a = RestaurantTable::factory()->for($restaurant)->create(['name' => 'Mesa 3']);
    $b = RestaurantTable::factory()->for($restaurant)->create(['name' => 'Mesa 4']);
    $customer = User::factory()->create();

    $response = $this->actingAs($customer, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/orders", [
            'fulfillment_type' => 'dinein', 'party_size' => 2, 'table_id' => $a->uuid,
            'items' => [['menu_item_id' => $item->uuid, 'qty' => 1]],
        ], ['Idempotency-Key' => Str::uuid()->toString()]);
    $response->assertStatus(201)->assertJsonPath('data.tableName', 'Mesa 3');

    $combination = $restaurant->tableCombinations()->create(['date' => now('Africa/Luanda')->toDateString(), 'seats' => 8]);
    $combination->syncTables([$a->id, $b->id]);

    $this->actingAs($customer, 'sanctum')
        ->postJson("/api/v1/restaurants/{$restaurant->uuid}/orders", [
            'fulfillment_type' => 'dinein', 'party_size' => 6, 'table_id' => $b->uuid,
            'items' => [['menu_item_id' => $item->uuid, 'qty' => 2]],
        ], ['Idempotency-Key' => Str::uuid()->toString()])
        ->assertStatus(201)
        ->assertJsonPath('data.tableName', 'Mesa 3 + Mesa 4');

    $this->actingAs($owner, 'sanctum')
        ->getJson("/api/v1/restaurants/{$restaurant->uuid}/orders")
        ->assertOk()
        ->assertJsonFragment(['tableName' => 'Mesa 3']);
});

test('mesa só vale no local e só deste restaurante', function () {
    $restaurant = Restaurant::factory()->create(['fulfillment_modes' => ['takeaway', 'dinein'], 'orders_paused_manually' => false]);
    $other = Restaurant::factory()->create();
    $menu = RestaurantMenu::factory()->for($restaurant)->create();
    $item = MenuItem::factory()->for($restaurant)->create(['menu_id' => $menu->id, 'price' => 2500]);
    $mine = RestaurantTable::factory()->for($restaurant)->create();
    $theirs = RestaurantTable::factory()->for($other)->create();
    $customer = User::factory()->create();
    $url = "/api/v1/restaurants/{$restaurant->uuid}/orders";

    $this->actingAs($customer, 'sanctum')->postJson($url, [
        'fulfillment_type' => 'dinein', 'party_size' => 2, 'table_id' => $theirs->uuid,
        'items' => [['menu_item_id' => $item->uuid, 'qty' => 1]],
    ], ['Idempotency-Key' => Str::uuid()->toString()])
        ->assertUnprocessable()->assertJsonValidationErrors('table_id');

    $this->actingAs($customer, 'sanctum')->postJson($url, [
        'fulfillment_type' => 'takeaway', 'pickup_asap' => true, 'table_id' => $mine->uuid,
        'items' => [['menu_item_id' => $item->uuid, 'qty' => 1]],
    ], ['Idempotency-Key' => Str::uuid()->toString()])
        ->assertUnprocessable()->assertJsonValidationErrors('table_id');
});
