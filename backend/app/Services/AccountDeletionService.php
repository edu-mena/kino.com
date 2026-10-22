<?php

namespace App\Services;

use App\Models\CustomerNote;
use App\Models\Order;
use App\Models\ProfileView;
use App\Models\Reservation;
use App\Models\Restaurant;
use App\Models\Review;
use App\Models\User;
use App\Support\RestaurantIndexCache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

/**
 * "Apagar a minha conta" (auditoria de segurança, Fase 3) — exigido pela
 * Apple (guideline 5.1.1(v)) e pelo Google Play, e direito do titular na
 * Lei n.º 22/11 (Proteção de Dados Pessoais, Angola).
 *
 * Apaga de facto (forceDelete, não soft delete — um user "apagado" com os
 * dados todos na BD não cumpre nada). O que pertence também ao
 * RESTAURANTE — pedidos, reservas, avaliações — fica, mas anonimizado:
 * valores, linhas e faturas são registo contabilístico/fiscal do
 * restaurante; nome, telefone, email, morada e notas do cliente saem.
 *
 * Tudo o resto sai em cascata pelas FKs (moradas, empresas, favoritos,
 * seguimentos, notificações, preferências, device tokens, equipa) — ver as
 * migrações; só o que não tem FK para `users` é tratado aqui à mão.
 */
class AccountDeletionService
{
    public const ANONYMOUS_NAME = 'Cliente removido';

    public function __construct(private readonly AppleSignInService $apple) {}

    public function delete(User $user): void
    {
        if ($user->isSystemOperator()) {
            throw new HttpException(403, 'Contas de sistema não podem ser apagadas por aqui.');
        }

        DB::transaction(function () use ($user) {
            // Dono de restaurante também pode apagar a conta sozinho (a Apple
            // não aceita "contacte o suporte", guideline 5.1.1(v)). O
            // restaurante não é dados pessoais dele: se era o único dono,
            // fica despublicado (some da app, dados do negócio guardados para
            // a Luku decidir); havendo outro dono, só sai da equipa (FK).
            $this->releaseOwnedRestaurants($user);

            // Query builder (não save() por modelo): sem disparar Observers
            // de pedido/reserva, que notificariam o restaurante de uma
            // "mudança" que não é nenhuma.
            Order::query()->where('user_id', $user->id)->update([
                'user_id' => null,
                'customer_name' => self::ANONYMOUS_NAME,
                'customer_phone' => '',
                'customer_email' => null,
                'delivery_address_snapshot' => null,
                'note' => null,
            ]);

            Reservation::query()->where('user_id', $user->id)->update([
                'user_id' => null,
                'customer_name' => self::ANONYMOUS_NAME,
                'customer_phone' => '',
                'customer_email' => null,
                'special_requests' => null,
            ]);

            Review::query()->where('user_id', $user->id)->update([
                'user_id' => null,
                'customer_name' => self::ANONYMOUS_NAME,
            ]);

            // Notas que os restaurantes escreveram sobre a pessoa — chave é
            // o email (senão o telefone), ver CustomerNoteController.
            $keys = array_values(array_filter([$user->email, $user->phone]));
            if ($keys) {
                CustomerNote::query()->whereIn('customer_key', $keys)->delete();
            }

            // FK é SET NULL (a contagem de visitas de convidados sobrevive
            // assim), mas a visita de uma conta apagada não tem de ficar.
            ProfileView::query()->where('user_id', $user->id)->delete();

            // Sem FK (relações polimórficas).
            $user->tokens()->delete();
            $user->roles()->detach();

            $user->forceDelete();
        });

        // Apple (guideline 5.1.1(v)): revogar o acesso dado por "Iniciar
        // sessão com Apple". Depois de apagar, e sem nunca bloquear a
        // eliminação — se a Apple falhar, a conta já não existe na Luku.
        $appleToken = $user->apple_token;
        if (is_array($appleToken) && isset($appleToken['refresh_token'], $appleToken['client_id'])) {
            try {
                $this->apple->revoke($appleToken['refresh_token'], $appleToken['client_id']);
            } catch (Throwable $e) {
                Log::warning('apple: revogação falhou ao apagar conta', ['error' => $e->getMessage()]);
            }
        }
    }

    private function releaseOwnedRestaurants(User $user): void
    {
        $owned = $user->restaurantUsers()->where('role_in_restaurant', 'owner')->pluck('restaurant_id');
        foreach ($owned as $restaurantId) {
            $otherOwners = DB::table('restaurant_users')
                ->where('restaurant_id', $restaurantId)
                ->where('role_in_restaurant', 'owner')
                ->where('user_id', '!=', $user->id)
                ->exists();
            if (! $otherOwners) {
                Restaurant::withTrashed()->whereKey($restaurantId)->update(['is_published' => false, 'orders_paused_manually' => true]);
                Log::info('conta apagada: restaurante despublicado (era o único dono)', ['restaurant_id' => $restaurantId]);
            }
        }
        if ($owned->isNotEmpty()) {
            RestaurantIndexCache::forget();
        }
    }
}
