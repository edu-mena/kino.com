<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\ForgotPasswordRequest;
use App\Http\Requests\Api\V1\Auth\GoogleCallbackRequest;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Http\Requests\Api\V1\Auth\ResetPasswordRequest;
use App\Http\Resources\Api\V1\UserResource;
use App\Models\User;
use App\Services\GoogleOAuthService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use RuntimeException;

class AuthController extends Controller
{
    /**
     * Login de CLIENTE — só Google OAuth real (ver plano). Aceita web
     * (authorization-code) e mobile nativo (id_token direto do SDK).
     */
    public function googleCallback(GoogleCallbackRequest $request, GoogleOAuthService $google): JsonResponse
    {
        try {
            $profile = $request->filled('id_token')
                ? $google->verifyIdToken($request->string('id_token'))
                : $google->resolveFromAuthorizationCode($request->string('code'));
        } catch (RuntimeException) {
            return response()->json([
                'message' => 'Não foi possível continuar com o Google. Tenta novamente.',
            ], 422);
        }

        $user = User::query()->where('google_id', $profile['sub'])->first();

        if (! $user) {
            // Conta pode já existir por outro meio (ex: seed) com o mesmo
            // email — liga a conta em vez de duplicar.
            $user = User::query()->where('email', $profile['email'])->where('role', 'customer')->first();
        }

        if (! $user) {
            $user = User::query()->create([
                'role' => 'customer',
                'name' => $profile['name'],
                'email' => $profile['email'],
                'google_id' => $profile['sub'],
                'avatar_url' => $profile['picture'],
                'email_verified_at' => now(),
            ]);
        } elseif (! $user->google_id) {
            $user->update(['google_id' => $profile['sub']]);
        }

        return $this->issueTokenResponse($request, $user);
    }

    /**
     * Login de restaurante/sistema — email+senha real, sem self-signup (a
     * conta só nasce via aprovação de PartnerApplication ou seed de
     * operador). Nunca aceita role=customer.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()
            ->whereIn('role', ['restaurant_staff', 'system_operator'])
            ->where('email', $request->string('email'))
            ->first();

        // Mensagem genérica — não revela se o email existe (ver plano).
        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            return response()->json(['message' => 'Credenciais inválidas.'], 401);
        }

        $user->update(['last_login_at' => now()]);

        return $this->issueTokenResponse($request, $user);
    }

    /** Revoga o token atual e emite um novo (Sanctum não tem refresh nativo
     * tipo JWT) — evita forçar novo login antes do token expirar. */
    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();
        $deviceName = $request->user()->currentAccessToken()->name;
        $request->user()->currentAccessToken()->delete();

        return $this->issueTokenResponse($request, $user, $deviceName);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sessão terminada.']);
    }

    /** "Sair de todos os dispositivos" — revoga todos os tokens do user. */
    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Sessão terminada em todos os dispositivos.']);
    }

    public function me(Request $request): UserResource
    {
        $user = $request->user()->load('restaurantUsers.restaurant');

        return new UserResource($user);
    }

    /** Só staff/operator (clientes não têm senha). */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $user = User::query()
            ->whereIn('role', ['restaurant_staff', 'system_operator'])
            ->where('email', $request->string('email'))
            ->first();

        // Sempre a mesma resposta, exista ou não o email — evita enumeração.
        if ($user) {
            Password::sendResetLink(['email' => $user->email]);
        }

        return response()->json(['message' => 'Se o email existir, enviámos um link de recuperação.']);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();
                $user->tokens()->delete(); // força novo login em todos os dispositivos
                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => __($status)], 422);
        }

        return response()->json(['message' => 'Senha alterada com sucesso.']);
    }

    private function issueTokenResponse(Request $request, User $user, ?string $deviceName = null): JsonResponse
    {
        $deviceName ??= (string) $request->input('device_name', 'default');
        $token = $user->createToken($deviceName, [$user->role]);

        return response()->json([
            'data' => [
                'token' => $token->plainTextToken,
                'user' => new UserResource($user),
            ],
        ]);
    }
}
