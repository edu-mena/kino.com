<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\ContactMessageController;
use App\Http\Controllers\Api\V1\CourierController;
use App\Http\Controllers\Api\V1\CustomerNoteController;
use App\Http\Controllers\Api\V1\DeliveryPolicyController;
use App\Http\Controllers\Api\V1\DeviceTokenController;
use App\Http\Controllers\Api\V1\FavoriteMenuItemController;
use App\Http\Controllers\Api\V1\FollowController;
use App\Http\Controllers\Api\V1\MenuItemController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\OfferController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PackageTypeController;
use App\Http\Controllers\Api\V1\PartnerApplicationController;
use App\Http\Controllers\Api\V1\ReservationController;
use App\Http\Controllers\Api\V1\RestaurantController;
use App\Http\Controllers\Api\V1\RestaurantMenuController;
use App\Http\Controllers\Api\V1\RestaurantPackageController;
use App\Http\Controllers\Api\V1\RestaurantStaffController;
use App\Http\Controllers\Api\V1\RestaurantTableController;
use App\Http\Controllers\Api\V1\ReviewController;
use App\Http\Controllers\Api\V1\SavedAddressController;
use App\Http\Controllers\Api\V1\StoryController;
use App\Http\Controllers\Api\V1\SubscriptionController;
use App\Http\Controllers\Api\V1\SupportTicketController;
use App\Http\Controllers\Api\V1\SystemAccessController;
use App\Http\Controllers\Api\V1\SystemStatsController;
use App\Http\Controllers\Api\V1\UploadController;
use App\Http\Controllers\Api\V1\UserPreferenceController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
| Fase 0: auth. Fase 1: restaurants + menus + menu-items (read-heavy) +
| upload genérico. Fases seguintes (reservations/orders/offers/stories/...)
| entram aqui à medida que forem implementadas — ver plano de migração.
*/

Route::prefix('auth')->group(function () {
    Route::post('google/callback', [AuthController::class, 'googleCallback'])->middleware('throttle:auth');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:auth');

    // Login de operador de sistema — superfície mais sensível da API,
    // isolada do resto do auth (ver AuthController::systemLogin): IP
    // bloqueado nem chega ao controller, throttle dedicado bem mais
    // apertado que o `auth` genérico, e cada tentativa gera auditoria +
    // email (dentro do próprio método, não é middleware).
    Route::post('system/login', [AuthController::class, 'systemLogin'])
        ->middleware(['ip.not-blocked', 'throttle:system-auth']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('logout-all', [AuthController::class, 'logoutAll']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

// Segurança do login de sistema (ver SystemAccessController) — `notify` é
// chamado pelo frontend ao abrir /sistema/entrar, `block-ip` é o link
// assinado do email de alerta (funciona sem sessão nenhuma).
Route::prefix('system-access')->group(function () {
    Route::post('notify', [SystemAccessController::class, 'notify'])
        ->middleware(['ip.not-blocked', 'throttle:system-auth']);
    Route::get('block-ip/{ip}', [SystemAccessController::class, 'blockIp'])
        ->middleware('signed')
        ->name('system-access.block-ip');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('blocked-ips', [SystemAccessController::class, 'index']);
        Route::delete('blocked-ips/{blockedIp}', [SystemAccessController::class, 'destroy']);
    });
});

// Leitura pública — sem auth (ver plano, "read-heavy" na Fase 1).
Route::get('restaurants', [RestaurantController::class, 'index']);
Route::get('restaurants/{restaurant}', [RestaurantController::class, 'show']);
Route::get('restaurants/{restaurant}/menus', [RestaurantMenuController::class, 'index']);
Route::get('restaurants/{restaurant}/menu-items', [MenuItemController::class, 'index']);

// Escrita — sempre autenticada; autorização fina fica nas Policies/FormRequests
// (ver RestaurantPolicy — staff só mexe no PRÓPRIO restaurante).
Route::middleware(['auth:sanctum', 'throttle:writes'])->group(function () {
    Route::post('restaurants', [RestaurantController::class, 'store']);
    Route::patch('restaurants/{restaurant}', [RestaurantController::class, 'update']);
    Route::put('restaurants/{restaurant}/hours', [RestaurantController::class, 'updateHours']);
    Route::get('restaurants/{restaurant}/payment-details', [RestaurantController::class, 'showPaymentDetails']);
    Route::put('restaurants/{restaurant}/payment-details', [RestaurantController::class, 'updatePaymentDetails']);
    Route::delete('restaurants/{restaurant}/gallery/{galleryImage}', [RestaurantController::class, 'destroyGalleryImage']);

    Route::post('restaurants/{restaurant}/menus', [RestaurantMenuController::class, 'store']);
    Route::patch('menus/{menu}', [RestaurantMenuController::class, 'update']);
    Route::delete('menus/{menu}', [RestaurantMenuController::class, 'destroy']);

    Route::post('restaurants/{restaurant}/menu-items', [MenuItemController::class, 'store']);
    Route::patch('menu-items/{menuItem}', [MenuItemController::class, 'update']);
    Route::delete('menu-items/{menuItem}', [MenuItemController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'throttle:uploads'])->group(function () {
    Route::post('restaurants/{restaurant}/gallery', [RestaurantController::class, 'storeGalleryImage']);
    Route::post('uploads', [UploadController::class, 'store']);
});

/*
|--------------------------------------------------------------------------
| Orders / Reservations — Fase 3
|--------------------------------------------------------------------------
| Checkout/reserva são públicos (cliente autenticado OU convidado — ver
| plano); autorização fina por dono/staff/guest_token fica nos controllers
| (AuthorizesGuestOrOwnerAccess), não dá para gate-ar com auth:sanctum no
| grupo de rotas todo. `throttle:writes` aqui aplica por IP quando não há
| user (RateLimiter::for('writes') já trata isso — ver AppServiceProvider).
*/
Route::middleware('throttle:writes')->group(function () {
    Route::post('restaurants/{restaurant}/orders', [OrderController::class, 'store'])
        ->middleware('idempotent');
    Route::get('orders/{order}', [OrderController::class, 'show']);
    Route::post('orders/{order}/cancel', [OrderController::class, 'cancel']);
    Route::post('orders/{order}/payment-proof', [OrderController::class, 'storePaymentProof']);

    Route::post('restaurants/{restaurant}/reservations', [ReservationController::class, 'store'])
        ->middleware('idempotent');
    Route::get('reservations/{reservation}', [ReservationController::class, 'show']);
    Route::post('reservations/{reservation}/cancel', [ReservationController::class, 'cancel']);
    Route::post('reservations/{reservation}/payment-proof', [ReservationController::class, 'storePaymentProof']);
});

// Gestão do restaurante — qualquer staff (manageOperations), não só owner.
Route::middleware(['auth:sanctum', 'throttle:writes'])->group(function () {
    Route::get('restaurants/{restaurant}/orders', [OrderController::class, 'index']);
    Route::patch('orders/{order}/accept', [OrderController::class, 'accept']);
    Route::patch('orders/{order}/dispatch', [OrderController::class, 'dispatch']);
    Route::patch('orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::post('orders/{order}/invoice', [OrderController::class, 'storeInvoice']);

    Route::get('restaurants/{restaurant}/reservations', [ReservationController::class, 'index']);
    Route::patch('reservations/{reservation}/status', [ReservationController::class, 'updateStatus']);
    Route::patch('reservations/{reservation}/table', [ReservationController::class, 'assignTable']);
    Route::patch('reservations/{reservation}/caution', [ReservationController::class, 'confirmCaution']);
    Route::post('reservations/{reservation}/invoice', [ReservationController::class, 'storeInvoice']);
});

/*
|--------------------------------------------------------------------------
| Stories / Offers — Fase 4
|--------------------------------------------------------------------------
| Leitura pública (feed global + por restaurante). Escrita: staff
| (manageOperations) para o próprio restaurante, ou system_operator para o
| institucional Luku (restaurant_id null — rotas *Global* dedicadas, nunca
| aceite via /restaurants/{restaurant}/...).
*/
Route::get('stories', [StoryController::class, 'index']);
Route::get('restaurants/{restaurant}/stories', [StoryController::class, 'indexForRestaurant']);
Route::get('offers', [OfferController::class, 'index']);
Route::get('restaurants/{restaurant}/offers', [OfferController::class, 'indexForRestaurant']);

Route::middleware(['auth:sanctum', 'throttle:uploads'])->group(function () {
    Route::post('restaurants/{restaurant}/stories', [StoryController::class, 'store']);
    Route::post('stories', [StoryController::class, 'storeGlobal']);
    Route::delete('stories/{story}', [StoryController::class, 'destroy']);
});

// Promoções — mesmo raciocínio de payment-proof/invoice (reservations/
// orders): apesar de aceitarem um ficheiro (media), ficam em `writes`
// (120/min), não `uploads` (10/min, partilhado com TODO upload de imagem
// do restaurante — pratos, capa, galeria). Um admin a montar o cardápio
// (várias fotos de prato) esgotava a quota antes de sequer chegar a criar
// a promoção, que falhava sempre com 429 — indistinguível de um erro
// genérico no frontend ("Não foi possível guardar a promoção").
Route::middleware(['auth:sanctum', 'throttle:writes'])->group(function () {
    Route::post('restaurants/{restaurant}/offers', [OfferController::class, 'store']);
    Route::post('offers', [OfferController::class, 'storeGlobal']);
    // POST, não PATCH: este endpoint aceita multipart (troca de
    // imagem/vídeo) — PHP só faz parse de corpo multipart em POST
    // (PATCH/PUT com ficheiro não chega a `$_FILES` num pedido real, só
    // funciona em testes porque o TestCase constrói o UploadedFile
    // diretamente em vez de simular o parsing HTTP real).
    Route::post('offers/{offer}', [OfferController::class, 'update']);
    Route::delete('offers/{offer}', [OfferController::class, 'destroy']);
});

/*
|--------------------------------------------------------------------------
| Sistema/Admin — Fase 5
|--------------------------------------------------------------------------
| Candidaturas de parceiro, subscrição (billing), tickets de suporte,
| notas de cliente. A maior parte é system_operator-only (assunto interno
| Luku) — checado dentro dos controllers/FormRequests, não no grupo de
| rotas (misturam ações públicas, de staff, e de operador na mesma área).
*/
Route::post('partner-applications', [PartnerApplicationController::class, 'store'])
    ->middleware('throttle:auth'); // formulário público — mesmo limite anti-spam do auth

Route::post('contact-messages', [ContactMessageController::class, 'store'])
    ->middleware('throttle:auth'); // formulário público de /contacto — mesmo limite anti-spam

Route::middleware(['auth:sanctum', 'throttle:writes'])->group(function () {
    Route::get('partner-applications', [PartnerApplicationController::class, 'index']);
    Route::post('partner-applications/{application}/approve', [PartnerApplicationController::class, 'approve']);
    Route::post('partner-applications/{application}/reject', [PartnerApplicationController::class, 'reject']);
    Route::delete('partner-applications/{application}', [PartnerApplicationController::class, 'destroy']);

    Route::get('subscriptions', [SubscriptionController::class, 'index']);
    Route::get('system/customers-count', [SystemStatsController::class, 'customersCount']);
    Route::get('restaurants/{restaurant}/subscription', [SubscriptionController::class, 'show']);
    Route::patch('restaurants/{restaurant}/subscription', [SubscriptionController::class, 'update']);
    Route::post('restaurants/{restaurant}/subscription/register-payment', [SubscriptionController::class, 'registerPayment']);
    Route::post('restaurants/{restaurant}/subscription/extend-trial', [SubscriptionController::class, 'extendTrial']);

    Route::get('support-tickets', [SupportTicketController::class, 'index']);
    Route::get('restaurants/{restaurant}/support-tickets', [SupportTicketController::class, 'indexForRestaurant']);
    Route::post('restaurants/{restaurant}/support-tickets', [SupportTicketController::class, 'store']);
    Route::patch('support-tickets/{ticket}/status', [SupportTicketController::class, 'updateStatus']);

    Route::get('restaurants/{restaurant}/customer-notes/{customerKey}', [CustomerNoteController::class, 'show']);
    Route::put('restaurants/{restaurant}/customer-notes/{customerKey}', [CustomerNoteController::class, 'update']);
});

/*
|--------------------------------------------------------------------------
| Reviews / Favorites / Notifications — Fase 6
|--------------------------------------------------------------------------
| Reviews sempre autenticadas (ver StoreReviewRequest — desvio deliberado
| do mock, que deixava avaliar sem conta). Notificações substituem o
| diffing client-side do mock por geração real em Observer (Order/
| Reservation) — sem broadcast em tempo real nesta fase (fica pra quando
| houver Docker/Reverb pra testar de verdade); o cliente faz polling.
*/
Route::get('restaurants/{restaurant}/reviews', [ReviewController::class, 'index']);

Route::middleware(['auth:sanctum', 'throttle:writes'])->group(function () {
    Route::post('restaurants/{restaurant}/reviews', [ReviewController::class, 'store']);
    Route::put('reviews/{review}/reply', [ReviewController::class, 'reply']);
    Route::delete('reviews/{review}', [ReviewController::class, 'destroy']);

    // Seguir restaurante (substitui os antigos favoritos de restaurante —
    // favoritos ficam só para pratos/bebidas). Ver FollowController.
    Route::get('follows', [FollowController::class, 'index']);
    Route::post('restaurants/{restaurant}/follow', [FollowController::class, 'store']);
    Route::patch('restaurants/{restaurant}/follow', [FollowController::class, 'update']);
    Route::delete('restaurants/{restaurant}/follow', [FollowController::class, 'destroy']);

    // Favoritos = só pratos e bebidas (ver FavoriteMenuItemController).
    Route::get('favorites/menu-items', [FavoriteMenuItemController::class, 'index']);
    Route::post('favorites/menu-items/sync', [FavoriteMenuItemController::class, 'sync']);
    Route::post('menu-items/{menuItem}/favorite', [FavoriteMenuItemController::class, 'store']);
    Route::delete('menu-items/{menuItem}/favorite', [FavoriteMenuItemController::class, 'destroy']);

    Route::get('notifications', [NotificationController::class, 'index']);
    Route::get('restaurants/{restaurant}/notifications', [NotificationController::class, 'indexForRestaurant']);
    Route::patch('notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::post('notifications/read', [NotificationController::class, 'markManyRead']);
});

/*
|--------------------------------------------------------------------------
| Perfil do cliente / mesas / staff / política de entrega — Fase 7
|--------------------------------------------------------------------------
| Fecha lacunas que ficaram sem endpoint nas fases anteriores: morada
| guardada (checkout já validava saved_address_id desde a Fase 3, mas não
| havia como o cliente CRIAR uma), preferências, gestão de mesas do
| restaurante (só nasciam 3 automáticas na aprovação — Fase 5), convite de
| staff (RestaurantPolicy::inviteStaff já existia desde a Fase 0, sem rota
| nenhuma a usá-la), e política de entrega (só seedada, nunca editável).
*/
Route::get('delivery-policy', [DeliveryPolicyController::class, 'show']);

// Tipos de pacote (Aniversário, Reunião de Negócios...) — catálogo da
// plataforma, gerido em /sistema/pacotes. Público (mostra só ativos a quem
// não é operador — ver PackageTypeController::index), permite ao cliente
// descobrir por tipo em /pacotes (Fase L3d) sem sessão nenhuma.
Route::get('package-types', [PackageTypeController::class, 'index']);
Route::get('package-types/{packageType}/restaurants', [PackageTypeController::class, 'restaurants']);

// Pacotes que UM restaurante oferece (ver PackageTypeController acima para
// o catálogo de tipos) — público, só ativos exceto para o próprio staff do
// restaurante (ver RestaurantPackageController::index), usado tanto na
// gestão de sala (/admin/mesas) quanto na descoberta do cliente por tipo de
// pacote (/pacotes, Fase L3d).
Route::get('restaurants/{restaurant}/packages', [RestaurantPackageController::class, 'index']);

Route::middleware(['auth:sanctum', 'throttle:writes'])->group(function () {
    Route::get('saved-addresses', [SavedAddressController::class, 'index']);
    Route::post('saved-addresses', [SavedAddressController::class, 'store']);
    Route::patch('saved-addresses/{savedAddress}', [SavedAddressController::class, 'update']);
    Route::delete('saved-addresses/{savedAddress}', [SavedAddressController::class, 'destroy']);

    // Empresas do cliente (nome/NIF/email) — para pedir fatura com NIF no
    // momento do pedido (ver StoreOrderRequest, OrderController::store).
    Route::get('companies', [CompanyController::class, 'index']);
    Route::post('companies', [CompanyController::class, 'store']);
    Route::patch('companies/{company}', [CompanyController::class, 'update']);
    Route::delete('companies/{company}', [CompanyController::class, 'destroy']);

    Route::get('preferences', [UserPreferenceController::class, 'show']);
    Route::put('preferences', [UserPreferenceController::class, 'update']);

    Route::get('reservations', [ReservationController::class, 'mine']);
    Route::get('orders', [OrderController::class, 'mine']);

    Route::get('restaurants/{restaurant}/tables', [RestaurantTableController::class, 'index']);
    Route::post('restaurants/{restaurant}/tables', [RestaurantTableController::class, 'store']);
    Route::patch('tables/{table}', [RestaurantTableController::class, 'update']);
    Route::delete('tables/{table}', [RestaurantTableController::class, 'destroy']);

    Route::post('restaurants/{restaurant}/packages', [RestaurantPackageController::class, 'store']);
    Route::patch('restaurant-packages/{restaurantPackage}', [RestaurantPackageController::class, 'update']);
    Route::delete('restaurant-packages/{restaurantPackage}', [RestaurantPackageController::class, 'destroy']);

    Route::get('restaurants/{restaurant}/staff', [RestaurantStaffController::class, 'index']);
    Route::post('restaurants/{restaurant}/staff', [RestaurantStaffController::class, 'store']);
    Route::patch('restaurants/{restaurant}/staff/{user}', [RestaurantStaffController::class, 'update']);
    Route::delete('restaurants/{restaurant}/staff/{user}', [RestaurantStaffController::class, 'destroy']);

    Route::patch('delivery-policy', [DeliveryPolicyController::class, 'update']);

    Route::post('package-types', [PackageTypeController::class, 'store']);
    Route::patch('package-types/{packageType}', [PackageTypeController::class, 'update']);
    Route::delete('package-types/{packageType}', [PackageTypeController::class, 'destroy']);
});

/*
|--------------------------------------------------------------------------
| Estafetas — Fase 8
|--------------------------------------------------------------------------
| Cada restaurante gere a própria frota (ver mock, src/lib/couriers.tsx —
| a Luku não opera uma partilhada). "Aceite -> A caminho" só existe via
| OrderController::dispatch (rota registada acima, no grupo de
| pedidos/reservas) — atribuir estafeta e avançar o pedido é uma ação só,
| nunca dois passos separados.
*/
Route::middleware(['auth:sanctum', 'throttle:writes'])->group(function () {
    Route::get('restaurants/{restaurant}/couriers', [CourierController::class, 'index']);
    Route::post('restaurants/{restaurant}/couriers', [CourierController::class, 'store']);
    Route::patch('couriers/{courier}', [CourierController::class, 'update']);
    Route::patch('couriers/{courier}/status', [CourierController::class, 'setStatus']);
    Route::delete('couriers/{courier}', [CourierController::class, 'destroy']);
});

/*
|--------------------------------------------------------------------------
| Notificações push (Web Push) — Fase 9
|--------------------------------------------------------------------------
| A tabela `device_tokens` já vinha antecipada desde a Fase 0 (enum
| `platform` já com "web"/"android"/"ios") mesmo sem nada disto estar
| ligado — ver a migração. Só "web" envia de verdade nesta fase
| (PushNotificationService, chaves VAPID em config/services.php); registar
| um token "android"/"ios" aqui já funciona, só que ainda não dispara nada
| (falta FCM/APNs, fora do escopo agora).
*/
Route::middleware(['auth:sanctum', 'throttle:writes'])->group(function () {
    Route::post('device-tokens', [DeviceTokenController::class, 'store']);
    Route::delete('device-tokens', [DeviceTokenController::class, 'destroy']);
});
