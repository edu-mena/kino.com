<?php

use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Support\Facades\Config;
use Kreait\Firebase\Contract\Messaging as FirebaseMessaging;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\MulticastSendReport;

/*
 * Push nativo (FCM): Android direto, iOS via APNs — o mesmo envio cobre os
 * dois (PushNotificationService::sendNative).
 */

test('notificação de pedido segue pelo FCM para os tokens Android E iOS, com configuração APNs', function () {
    Config::set('firebase.projects.'.config('firebase.default').'.credentials', 'credenciais-de-teste');

    $sent = [];
    $fcm = Mockery::mock(FirebaseMessaging::class);
    $fcm->shouldReceive('sendMulticast')->andReturnUsing(function (CloudMessage $message, array $tokens) use (&$sent) {
        $sent[] = ['message' => $message->jsonSerialize(), 'tokens' => $tokens];

        return MulticastSendReport::withItems([]);
    });
    $this->app->instance(FirebaseMessaging::class, $fcm);

    $restaurant = Restaurant::factory()->create();
    $user = User::factory()->create();
    $user->deviceTokens()->create(['platform' => 'android', 'token' => 'fcm-android']);
    $user->deviceTokens()->create(['platform' => 'ios', 'token' => 'fcm-ios']);

    // Aceitar o pedido notifica o CLIENTE (que tem os dois telemóveis).
    $order = $restaurant->orders()->create([
        'user_id' => $user->id, 'fulfillment_type' => 'takeaway', 'customer_name' => $user->name,
        'customer_phone' => '900', 'pickup_asap' => true, 'status' => 'pending', 'subtotal' => 1000, 'total' => 1000,
    ]);
    $order->update(['status' => 'accepted']);

    $toUser = collect($sent)->first(fn ($s) => in_array('fcm-ios', $s['tokens'], true));
    expect($toUser)->not->toBeNull()
        ->and($toUser['tokens'])->toContain('fcm-android')
        ->and($toUser['message']['apns']['payload']['aps']['sound'] ?? null)->toBe('default')
        ->and($toUser['message']['android']['priority'] ?? null)->toBe('high');
});
