<?php

use App\Models\Restaurant;
use Illuminate\Support\Facades\Broadcast;

// `guards: ['sanctum']` nos dois — sem isto, `Broadcast::auth()` resolve o
// utilizador pelo guard por OMISSÃO da app (`config('auth.defaults.guard')`
// = 'web', sessão/cookie), nunca o token Bearer que `auth:sanctum`
// autenticou na rota (ver bootstrap/app.php) — todo canal privado dava 403
// sempre, mesmo autenticado.
//
// `{id}` aqui é sempre o UUID PÚBLICO, nunca a PK interna — o frontend nunca
// tem acesso à PK interna de si próprio (nenhum resource a expõe, ver
// `HasPublicUuid` em toda a app), só ao uuid já devolvido em `user.id`/
// `restaurant.id`. `NotificationCreated::broadcastOn()` monta o nome do
// canal com o mesmo uuid.
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return $user->uuid === $id;
}, ['guards' => ['sanctum']]);

/** Notificações do restaurante (pedido/reserva novos ou com estado mudado)
 * — uma transmissão por restaurante, não uma por membro da equipa (ver
 * NotificationCreated). Qualquer membro do staff desse restaurante, ou
 * system_operator, pode ouvir. */
Broadcast::channel('App.Models.Restaurant.{id}', function ($user, $id) {
    if ($user->isSystemOperator()) {
        return true;
    }

    $restaurant = Restaurant::query()->where('uuid', $id)->first();

    return $restaurant && $user->restaurantUsers()->where('restaurant_id', $restaurant->id)->exists();
}, ['guards' => ['sanctum']]);
