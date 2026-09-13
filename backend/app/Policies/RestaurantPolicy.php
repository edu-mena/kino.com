<?php

namespace App\Policies;

use App\Models\Restaurant;
use App\Models\User;

/**
 * Padrão de autorização por `restaurant_id` a replicar em todas as Policies
 * de recursos scoped a um restaurante (menus, orders, reservations, tables,
 * offers, stories, support tickets, ...): nunca basta checar
 * `role === 'restaurant_staff'` — tem de se confirmar que o user tem uma
 * linha em `restaurant_users` para *aquele* restaurante específico, senão
 * qualquer dono de restaurante conseguiria editar os dados de outro.
 */
class RestaurantPolicy
{
    public function viewAny(?User $user): bool
    {
        return true; // listagem pública
    }

    public function view(?User $user, Restaurant $restaurant): bool
    {
        return true; // ficha pública
    }

    public function create(User $user): bool
    {
        // Sem self-signup — só nasce via aprovação de PartnerApplication.
        return $user->isSystemOperator();
    }

    public function update(User $user, Restaurant $restaurant): bool
    {
        if ($user->isSystemOperator()) {
            return true;
        }

        return $this->roleInRestaurant($user, $restaurant) !== null;
    }

    /** Só o dono edita dados de pagamento/convida staff — manager/staff não. */
    public function managePaymentDetails(User $user, Restaurant $restaurant): bool
    {
        if ($user->isSystemOperator()) {
            return true;
        }

        return $this->roleInRestaurant($user, $restaurant) === 'owner';
    }

    /**
     * Política de negócio do restaurante (decisão confirmada com o
     * utilizador em revisão cruzada) — fulfillment_modes,
     * accepted_payment_methods, caution_modes_for_orders, caution_amount.
     * Mesma restrição que managePaymentDetails: é dinheiro/política
     * comercial (que modos de entrega existem, que métodos de pagamento se
     * aceita, quando se cobra caução e quanto), não operação do dia a dia —
     * manager/staff não devem poder mudar isto, só o owner. Ver
     * UpdateRestaurantRequest, que só exige esta ability quando o payload
     * de facto toca nestes campos (o resto de `update` continua aberto a
     * manager/staff).
     */
    public function manageBusinessPolicy(User $user, Restaurant $restaurant): bool
    {
        if ($user->isSystemOperator()) {
            return true;
        }

        return $this->roleInRestaurant($user, $restaurant) === 'owner';
    }

    public function inviteStaff(User $user, Restaurant $restaurant): bool
    {
        return $this->roleInRestaurant($user, $restaurant) === 'owner';
    }

    /**
     * Operação do dia a dia (aceitar/avançar pedidos, gerir reservas/mesas)
     * — qualquer role de staff serve, ao contrário de `update` (perfil do
     * restaurante) ou `manageBusinessPolicy`/`managePaymentDetails`
     * (dinheiro/comercial, só owner). Um funcionário de balcão tem de
     * conseguir aceitar um pedido sem ser dono.
     */
    public function manageOperations(User $user, Restaurant $restaurant): bool
    {
        if ($user->isSystemOperator()) {
            return true;
        }

        return $this->roleInRestaurant($user, $restaurant) !== null;
    }

    public function delete(User $user, Restaurant $restaurant): bool
    {
        return $user->isSystemOperator();
    }

    private function roleInRestaurant(User $user, Restaurant $restaurant): ?string
    {
        return $user->restaurantUsers
            ->firstWhere('restaurant_id', $restaurant->id)
            ?->role_in_restaurant;
    }
}
