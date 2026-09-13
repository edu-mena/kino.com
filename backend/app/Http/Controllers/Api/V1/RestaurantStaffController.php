<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\RestaurantStaff\InviteStaffRequest;
use App\Http\Requests\Api\V1\RestaurantStaff\UpdateStaffRoleRequest;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/** Convite/gestão de staff — só o owner (ver RestaurantPolicy::inviteStaff).
 * Nunca cria outro "owner" por aqui (ver InviteStaffRequest). */
class RestaurantStaffController extends Controller
{
    public function index(Request $request, Restaurant $restaurant): JsonResponse
    {
        $this->authorize('manageOperations', $restaurant);

        $staff = $restaurant->staff()->get()->map(fn (User $user) => [
            'id' => $user->uuid,
            'name' => $user->name,
            'email' => $user->email,
            'roleInRestaurant' => $user->pivot->role_in_restaurant,
        ]);

        return response()->json(['data' => $staff]);
    }

    public function store(InviteStaffRequest $request, Restaurant $restaurant): JsonResponse
    {
        $data = $request->validated();

        $user = User::query()->where('role', 'restaurant_staff')->where('email', $data['email'])->first();
        $isNewAccount = ! $user;

        if (! $user) {
            $user = User::query()->create([
                'role' => 'restaurant_staff',
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make(Str::random(40)),
            ]);
        }

        abort_if(
            $restaurant->staff()->where('user_id', $user->id)->exists(),
            422,
            'Esta pessoa já faz parte da equipa deste restaurante.',
        );

        $restaurant->staff()->attach($user->id, ['role_in_restaurant' => $data['role_in_restaurant']]);

        if ($isNewAccount) {
            Password::sendResetLink(['email' => $user->email]);
        }

        return response()->json(['data' => [
            'id' => $user->uuid,
            'name' => $user->name,
            'email' => $user->email,
            'roleInRestaurant' => $data['role_in_restaurant'],
        ]], 201);
    }

    public function update(UpdateStaffRoleRequest $request, Restaurant $restaurant, User $user): JsonResponse
    {
        $pivot = $restaurant->staff()->where('user_id', $user->id)->first();
        abort_unless($pivot, 404);
        abort_if($pivot->pivot->role_in_restaurant === 'owner', 422, 'Não é possível mudar o papel do dono por aqui.');

        $restaurant->staff()->updateExistingPivot($user->id, [
            'role_in_restaurant' => $request->validated('role_in_restaurant'),
        ]);

        return response()->json(['data' => [
            'id' => $user->uuid,
            'roleInRestaurant' => $request->validated('role_in_restaurant'),
        ]]);
    }

    /** Nunca remove o dono, e nunca o último owner (o restaurante ficaria
     * sem ninguém a conseguir gerir dinheiro/staff). */
    public function destroy(Request $request, Restaurant $restaurant, User $user): JsonResponse
    {
        $this->authorize('inviteStaff', $restaurant);

        $pivot = $restaurant->staff()->where('user_id', $user->id)->first();
        abort_unless($pivot, 404);
        abort_if($pivot->pivot->role_in_restaurant === 'owner', 422, 'Não é possível remover o dono do restaurante.');

        $restaurant->staff()->detach($user->id);

        return response()->json(status: 204);
    }
}
