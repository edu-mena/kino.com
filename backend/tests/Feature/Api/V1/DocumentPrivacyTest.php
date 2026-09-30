<?php

use App\Models\Notification;
use App\Models\Order;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/*
 * Comprovativos de pagamento e faturas (NIF, dados bancários) — auditoria de
 * segurança, Fase 2: bucket privado + URL assinado de curta duração, nunca
 * o bucket público de imagens.
 */

beforeEach(function () {
    Storage::fake('r2', ['url' => 'https://cdn.luku.com']);
});

function orderForDocuments(array $attrs = []): Order
{
    return Restaurant::factory()->create()->orders()->create([
        'fulfillment_type' => 'takeaway', 'customer_name' => 'X', 'customer_phone' => '900',
        'pickup_asap' => true, 'status' => 'accepted', 'subtotal' => 1000, 'total' => 1000,
        'guest_token' => (string) Str::uuid(),
        ...$attrs,
    ]);
}

test('comprovativo vai para o disco privado — nunca para o bucket público — e volta como URL assinado', function () {
    $order = orderForDocuments();

    $url = $this->withHeader('X-Guest-Token', $order->guest_token)
        ->postJson("/api/v1/orders/{$order->uuid}/payment-proof", [
            'proof' => UploadedFile::fake()->create('comprovativo.pdf', 100, 'application/pdf'),
        ])
        ->assertOk()
        ->json('data.paymentProofUrl');

    $stored = $order->fresh()->payment_proof_url;
    expect($stored)->toStartWith('payment-proof/')              // path, não URL
        ->and($url)->not->toStartWith('https://cdn.luku.com')    // nunca a CDN pública
        ->and($url)->toContain('expiration=');                   // URL temporário

    Storage::disk(config('filesystems.documents_disk'))->assertExists($stored);
    expect(Storage::disk('r2')->allFiles())->toBe([]);
});

test('fatura emitida pelo restaurante também fica privada', function () {
    $order = orderForDocuments();
    $owner = ownerOf($order->restaurant);

    $this->actingAs($owner, 'sanctum')
        ->postJson("/api/v1/orders/{$order->uuid}/invoice", [
            'invoice' => UploadedFile::fake()->create('fatura.pdf', 100, 'application/pdf'),
        ])
        ->assertOk()
        ->assertJsonPath('data.invoiceUrl', fn ($url) => str_contains($url, 'expiration='));

    expect(Storage::disk('r2')->allFiles())->toBe([]);
});

test('substituir o comprovativo apaga o anterior', function () {
    $order = orderForDocuments();
    $send = fn () => $this->withHeader('X-Guest-Token', $order->guest_token)
        ->postJson("/api/v1/orders/{$order->uuid}/payment-proof", [
            'proof' => UploadedFile::fake()->image('comprovativo.jpg'),
        ])->assertOk();

    $send();
    $first = $order->fresh()->payment_proof_url;
    $send();

    Storage::disk(config('filesystems.documents_disk'))->assertMissing($first);
    Storage::disk(config('filesystems.documents_disk'))->assertExists($order->fresh()->payment_proof_url);
});

test('estranho sem guest_token não vê o pedido (nem o URL do comprovativo)', function () {
    $order = orderForDocuments(['payment_proof_url' => 'payment-proof/x/y.pdf']);

    $this->getJson("/api/v1/orders/{$order->uuid}")->assertNotFound();
    $this->actingAs(User::factory()->create(), 'sanctum')
        ->getJson("/api/v1/orders/{$order->uuid}")->assertNotFound();
});

test('comprovativo antigo (URL público de antes da migração) continua a abrir até ser movido', function () {
    $order = orderForDocuments(['payment_proof_url' => 'https://cdn.luku.com/payment-proof/x/antigo.jpg']);

    $this->withHeader('X-Guest-Token', $order->guest_token)
        ->getJson("/api/v1/orders/{$order->uuid}")
        ->assertOk()
        ->assertJsonPath('data.paymentProofUrl', 'https://cdn.luku.com/payment-proof/x/antigo.jpg');
});

test('documents:privatize move os documentos antigos da CDN para o disco privado, sem notificar ninguém', function () {
    Storage::disk('r2')->put('payment-proof/o1/antigo.jpg', 'conteudo');
    $order = orderForDocuments(['payment_proof_url' => 'https://cdn.luku.com/payment-proof/o1/antigo.jpg']);
    $notificationsBefore = Notification::query()->count();

    $this->artisan('documents:privatize', ['--dry-run' => true])->assertSuccessful();
    expect($order->fresh()->payment_proof_url)->toStartWith('https://');

    $this->artisan('documents:privatize')->assertSuccessful();

    expect($order->fresh()->payment_proof_url)->toBe('payment-proof/o1/antigo.jpg');
    Storage::disk('r2')->assertMissing('payment-proof/o1/antigo.jpg');
    expect(Storage::disk(config('filesystems.documents_disk'))->get('payment-proof/o1/antigo.jpg'))->toBe('conteudo')
        ->and(Notification::query()->count())->toBe($notificationsBefore);
});
