<?php

namespace App\Services;

use App\Models\CustomerNote;
use App\Models\Order;
use App\Models\ProfileView;
use App\Models\Reservation;
use App\Models\Review;
use App\Models\User;
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

        if ($user->restaurantUsers()->where('role_in_restaurant', 'owner')->exists()) {
            throw new HttpException(422, 'É dono de um restaurante na Luku — contacte o suporte para encerrar o restaurante e a conta.');
        }

        DB::transaction(function () use ($user) {
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
}
