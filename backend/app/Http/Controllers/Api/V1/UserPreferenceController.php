<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UserPreferences\UpdateUserPreferenceRequest;
use App\Http\Resources\Api\V1\UserPreferenceResource;
use Illuminate\Http\Request;

class UserPreferenceController extends Controller
{
    public function show(Request $request): UserPreferenceResource
    {
        $preference = $request->user()->preferences ?? $request->user()->preferences()->make();

        return new UserPreferenceResource($preference);
    }

    public function update(UpdateUserPreferenceRequest $request): UserPreferenceResource
    {
        $data = $request->validated();

        // Booleano na entrada, timestamp gravada — mesma convenção de
        // `email_verified_at` (ver User::casts()). `false`/ausente nunca
        // limpa a timestamp: uma vez visto, fica visto (não há caso de uso
        // real para "esquecer" isto).
        foreach (['tutorial_seen' => 'tutorial_seen_at', 'dietary_onboarding_seen' => 'dietary_onboarding_seen_at'] as $input => $column) {
            if (($data[$input] ?? false) === true) {
                $data[$column] = now();
            }
            unset($data[$input]);
        }

        $preference = $request->user()->preferences()->updateOrCreate([], $data);

        return new UserPreferenceResource($preference);
    }
}
